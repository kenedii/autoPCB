import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent

MONKEY_PATCH = """
import skidl
from skidl.part import Part as OriginalPart
from skidl.pin import Pin

class AutoPart(OriginalPart):
    def __init__(self, *args, **kwargs):
        try:
            super().__init__(*args, **kwargs)
        except Exception:
            name = kwargs.get('name', 'Unknown')
            if len(args) > 1:
                name = args[1]
            elif len(args) == 1:
                name = args[0]
            kwargs_new = {'tool': kwargs.get('tool', skidl.SKIDL), 'name': name, 'pins': []}
            if 'footprint' in kwargs:
                kwargs_new['footprint'] = kwargs['footprint']
            if 'value' in kwargs:
                kwargs_new['value'] = kwargs['value']
            if 'ref' in kwargs:
                kwargs_new['ref'] = kwargs['ref']
            if 'dest' in kwargs:
                kwargs_new['dest'] = kwargs['dest']
            super().__init__(**kwargs_new)

    def __getitem__(self, key):
        try:
            res = super().__getitem__(key)
            if res is None or (isinstance(res, (list, tuple)) and len(res) == 0):
                p = Pin(num=str(key), name=str(key))
                self += p
                return super().__getitem__(key)
            return res
        except Exception:
            p = Pin(num=str(key), name=str(key))
            self += p
            return super().__getitem__(key)

    def __getattr__(self, key):
        try:
            res = super().__getattr__(key)
            if res is None or (isinstance(res, (list, tuple)) and len(res) == 0):
                k = str(key)
                p = Pin(num=k, name=k)
                self += p
                return super().__getattr__(key)
            return res
        except Exception as e:
            k = str(key)
            if k.startswith('_') or k in ['ref_prefix', 'circuit', 'logger', 'name', 'ref', 'value', 'footprint', 'hierarchy', 'aliases', 'keywords', 'description', 'datasheet', 'search_text', 'do_erc']:
                raise e
            p = Pin(num=k, name=k)
            self += p
            return super().__getattr__(key)

skidl.Part = AutoPart
Part = AutoPart
"""

OUTPUT_BLOCK = """
try:
    generate_netlist(file_='circuit.net')
except Exception:
    pass
try:
    generate_netlist(file_='circuit.spice', tool=SPICE)
except Exception:
    pass
try:
    generate_netlist(file_='circuit.cir', tool=SPICE)
except Exception:
    pass
try:
    generate_pcb(file_='circuit.kicad_pcb')
except Exception:
    pass
try:
    generate_schematic(file_='circuit.kicad_sch')
except Exception:
    pass
"""


def build_wrapped_source(source: str) -> str:
    if "from skidl import *" in source:
        source = source.replace("from skidl import *", "from skidl import *\nset_default_tool(KICAD6)\n" + MONKEY_PATCH)
    else:
        source = "from skidl import *\nset_default_tool(KICAD6)\n" + MONKEY_PATCH + "\n" + source
    return source + "\n\n" + OUTPUT_BLOCK


class TestSkidlRobustness(unittest.TestCase):
    def run_case(self, name: str, source: str) -> None:
        with tempfile.TemporaryDirectory(prefix=f"autoskidl-{name}-") as temp_dir:
            temp = Path(temp_dir)
            script = temp / "circuit.py"
            script.write_text(build_wrapped_source(source), encoding="utf-8")

            result = subprocess.run(
                [shutil.which("python") or "python", str(script)],
                cwd=temp,
                capture_output=True,
                text=True,
                timeout=90,
            )

            self.assertEqual(
                result.returncode,
                0,
                msg=f"{name} failed.\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}",
            )

            files = {p.name for p in temp.iterdir() if p.is_file()}
            self.assertIn("circuit.net", files, msg=f"{name} did not generate a netlist.")
            self.assertIn("circuit.erc", files, msg=f"{name} did not generate ERC output.")

            net_content = (temp / "circuit.net").read_text(encoding="utf-8")
            self.assertIn("(export", net_content, msg=f"{name} netlist did not look valid.")
            self.assertIn("(components", net_content, msg=f"{name} netlist is missing component section.")

            # A robust run should include helper library output even if external KiCad exporters are unavailable.
            self.assertIn("circuit_sklib.py", files, msg=f"{name} did not generate SKiDL helper library output.")

    def test_one_test_to_cover_everything(self):
        ddr_source = (ROOT / "example_ddr1.py").read_text(encoding="utf-8")

        circuits = [
            (
                "led_resistor",
                """
from skidl import *
vcc = Net('VCC')
gnd = Net('GND')
r1 = Part('Device', 'R', value='330', footprint='Resistor_SMD:R_0603_1608Metric')
d1 = Part('Device', 'LED', value='RED', footprint='LED_SMD:LED_0603_1608Metric')
r1[1] += vcc
r1[2] += d1['A']
d1['K'] += gnd
""",
            ),
            (
                "astable_555_timer",
                """
from skidl import *
vcc = Net('VCC')
gnd = Net('GND')
trig = Net('TRIG')
thresh = Net('THRESH')
disch = Net('DISCH')
out = Net('OUT')

u1 = Part('Timer', 'NE555', footprint='Package_DIP:DIP-8_W7.62mm')
r1 = Part('Device', 'R', value='1k', footprint='Resistor_SMD:R_0603_1608Metric')
r2 = Part('Device', 'R', value='10k', footprint='Resistor_SMD:R_0603_1608Metric')
c1 = Part('Device', 'C', value='10n', footprint='Capacitor_SMD:C_0603_1608Metric')

u1['VCC'] += vcc
u1['GND'] += gnd
u1['THR'] += thresh
u1['TRIG'] += trig
u1['DIS'] += disch
u1['OUT'] += out
u1['RST'] += vcc

r1[1] += vcc
r1[2] += disch
r2[1] += disch
r2[2] += thresh
thresh += trig
c1[1] += thresh
c1[2] += gnd
""",
            ),
            (
                "logic_gate",
                """
from skidl import *
vcc = Net('VCC')
gnd = Net('GND')
a = Net('A')
b = Net('B')
y = Net('Y')

u1 = Part('74xx', '74HC08', footprint='Package_SO:SOIC-14_3.9x8.7mm_P1.27mm')
u1['VCC'] += vcc
u1['GND'] += gnd
u1['1A'] += a
u1['1B'] += b
u1['1Y'] += y
""",
            ),
            ("ddr1_example", ddr_source),
        ]

        for name, source in circuits:
            with self.subTest(case=name):
                self.run_case(name, source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
