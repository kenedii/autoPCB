import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent

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
            desired_ref = kwargs.get('ref')
            if len(args) > 1:
                name = args[1]
            elif len(args) == 1:
                name = args[0]
            kwargs_new = {'tool': kwargs.get('tool', skidl.SKIDL), 'name': name, 'pins': []}
            if 'footprint' in kwargs:
                kwargs_new['footprint'] = kwargs['footprint']
            if 'value' in kwargs:
                kwargs_new['value'] = kwargs['value']
            if 'dest' in kwargs:
                kwargs_new['dest'] = kwargs['dest']
            super().__init__(**kwargs_new)
            if desired_ref:
                try:
                    if getattr(self, 'circuit', None) is not None:
                        self.ref = desired_ref
                    else:
                        self._ref = str(desired_ref)
                except Exception:
                    self._ref = str(desired_ref)

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
            if k.startswith('_') or k in ['ref_prefix', 'circuit', 'logger', 'name', 'ref', 'value', 'footprint', 'hierarchy', 'aliases', 'keywords', 'description', 'datasheet', 'search_text', 'do_erc', 'tag', 'tag_ref_name', 'hiername', 'hiertuple']:
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
            (
                "esp32_dev_board_style",
                """
from skidl import *
v33 = Net('3V3')
gnd = Net('GND')
uart_tx = Net('UART_TX')
uart_rx = Net('UART_RX')

esp32 = Part(tool=SKIDL, name='ESP32_WROOM32', ref='U1', footprint='RF_Module:ESP32-WROOM-32',
             pins=[Pin(num='1', name='3V3'), Pin(num='2', name='EN'), Pin(num='3', name='IO36'),
                   Pin(num='4', name='IO39'), Pin(num='5', name='IO34'), Pin(num='6', name='IO35'),
                   Pin(num='7', name='IO32'), Pin(num='8', name='IO33'), Pin(num='9', name='IO25'),
                   Pin(num='10', name='IO26'), Pin(num='11', name='IO27'), Pin(num='12', name='IO14'),
                   Pin(num='13', name='IO12'), Pin(num='14', name='GND'), Pin(num='15', name='IO13'),
                   Pin(num='16', name='IO9'), Pin(num='17', name='IO10'), Pin(num='18', name='IO11'),
                   Pin(num='19', name='IO6'), Pin(num='20', name='IO7'), Pin(num='21', name='IO8'),
                   Pin(num='22', name='IO15'), Pin(num='23', name='IO2'), Pin(num='24', name='IO0'),
                   Pin(num='25', name='IO4'), Pin(num='26', name='IO16'), Pin(num='27', name='IO17'),
                   Pin(num='28', name='IO5'), Pin(num='29', name='IO18'), Pin(num='30', name='IO19'),
                   Pin(num='31', name='NC'), Pin(num='32', name='IO21'), Pin(num='33', name='RX0'),
                   Pin(num='34', name='TX0'), Pin(num='35', name='IO22'), Pin(num='36', name='IO23'),
                   Pin(num='37', name='GND'), Pin(num='38', name='IO1')])

v33 += esp32['3V3']
gnd += esp32['GND']
uart_tx += esp32['TX0']
uart_rx += esp32['RX0']
""",
            ),
            (
                "legacy_6502_minimal",
                """
from skidl import *
vcc = Net('VCC')
gnd = Net('GND')
clk = Net('CLK')
resb = Net('RESB')

cpu = Part(tool=SKIDL, name='W65C02', ref='U1', footprint='Package_DIP:DIP-40_W15.24mm',
           pins=[Pin(num=str(i), name=f'P{i}') for i in range(1, 41)])
rom = Part(tool=SKIDL, name='27C256', ref='U2', footprint='Package_DIP:DIP-28_W15.24mm',
           pins=[Pin(num=str(i), name=f'P{i}') for i in range(1, 29)])

vcc += cpu['8']
vcc += rom['28']
gnd += cpu['1']
gnd += rom['14']
clk += cpu['37']
resb += cpu['40']
""",
            ),
            (
                "obscure_motherboard_symbols",
                """
from skidl import *
v12 = Net('12V')
gnd = Net('GND')

atx24 = Part('Connector', 'ATX_24Pin', ref='J1', footprint='Connector_PinHeader_2.54mm:PinHeader_1x24_P2.54mm_Vertical')
atx8 = Part('Connector', 'ATX_8Pin', ref='J2', footprint='Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical')
cpu = Part('AMD', 'Ryzen_AM4', ref='U1', footprint='Package_BGA:UFBGA-1331_40x40mm_Layout37x37_P1.0mm')
chipset = Part('AMD', 'X570', ref='U2', footprint='Package_BGA:UFBGA-900_31x31mm_Layout30x30_P1.0mm')
dimm_a = Part('Memory', 'DDR4_DIMM', ref='J3', footprint='Connector_PCBEdge:DDR4_DIMM')
pciex16 = Part('Connector', 'PCIExpress_x16', ref='J4', footprint='Connector_PCBEdge:BUS_PCI_Express_x16')
pwm = Part('Power_Management', 'PWM_Controller', ref='U3', footprint='Package_SO:TSSOP-16_4.4x5mm_P0.65mm')
mosfet = [Part('Transistor_FET', 'N-Channel_MOSFET', ref=f'Q{i+1}', footprint='Package_TO_SOT_SMD:SOT-23') for i in range(4)]

for i in range(1, 25):
    v12 += atx24[i]
for i in range(1, 9):
    v12 += atx8[i]
for i in range(4):
    v12 += mosfet[i].d
    gnd += mosfet[i].s
""",
            ),
            (
                "am3_socket_stub",
                """
from skidl import *
v12 = Net('12V')
v5 = Net('5V')
gnd = Net('GND')

atx24 = Part('Connector', 'ATX_24Pin', ref='J1', footprint='Connector_PinHeader_2.54mm:PinHeader_1x24_P2.54mm_Vertical')
eps8 = Part('Connector', 'ATX_8Pin', ref='J2', footprint='Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical')
cpu = Part('AMD', 'AM3_CPU', ref='U1', footprint='Package_BGA:UFBGA-938_31x31mm_Layout30x30_P1.0mm')
dimm = Part('Memory', 'DDR3_DIMM', ref='J3', footprint='Connector_PCBEdge:DDR3_DIMM')

for i in range(1, 25):
    v12 += atx24[i]
for i in range(1, 9):
    v12 += eps8[i]
v5 += cpu[1]
gnd += cpu[2]
v5 += dimm[1]
gnd += dimm[2]
""",
            ),
            (
                "am4_socket_stub",
                """
from skidl import *
v12 = Net('12V')
gnd = Net('GND')

atx24 = Part('Connector', 'ATX_24Pin', ref='J1', footprint='Connector_PinHeader_2.54mm:PinHeader_1x24_P2.54mm_Vertical')
eps8 = Part('Connector', 'ATX_8Pin', ref='J2', footprint='Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical')
cpu = Part('AMD', 'Ryzen_AM4', ref='U1', footprint='Package_BGA:UFBGA-1331_40x40mm_Layout37x37_P1.0mm')
pciex = Part('Connector', 'PCIExpress_x16', ref='J3', footprint='Connector_PCBEdge:BUS_PCI_Express_x16')
m2 = Part('Connector', 'M.2_M-Key', ref='J4', footprint='Connector_PCBEdge:M.2_M')

for i in range(1, 25):
    v12 += atx24[i]
for i in range(1, 9):
    v12 += eps8[i]
v12 += pciex[1]
gnd += pciex[2]
v12 += m2[1]
gnd += m2[2]
v12 += cpu[1]
gnd += cpu[2]
""",
            ),
            (
                "am5_socket_stub",
                """
from skidl import *
v12 = Net('12V')
v5 = Net('5V')
gnd = Net('GND')

atx24 = Part('Connector', 'ATX_24Pin', ref='J1', footprint='Connector_PinHeader_2.54mm:PinHeader_1x24_P2.54mm_Vertical')
eps8 = Part('Connector', 'ATX_8Pin', ref='J2', footprint='Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical')
cpu = Part('AMD', 'Ryzen_AM5', ref='U1', footprint='Package_LGA:LGA-1718')
dimm_a = Part('Memory', 'DDR5_DIMM', ref='J3', footprint='Connector_PCBEdge:DDR5_DIMM')
dimm_b = Part('Memory', 'DDR5_DIMM', ref='J4', footprint='Connector_PCBEdge:DDR5_DIMM')

for i in range(1, 25):
    v12 += atx24[i]
for i in range(1, 9):
    v12 += eps8[i]
v12 += cpu[1]
gnd += cpu[2]
v5 += dimm_a[1]
gnd += dimm_a[2]
v5 += dimm_b[1]
gnd += dimm_b[2]
""",
            ),
            (
                "mixed_old_new_ics",
                """
from skidl import *
vcc = Net('VCC')
gnd = Net('GND')
vin = Net('VIN')
vout = Net('VOUT')

lm741 = Part(tool=SKIDL, name='LM741', ref='U1', footprint='Package_DIP:DIP-8_W7.62mm',
             pins=[Pin(num='1',name='OS1'), Pin(num='2',name='IN-'), Pin(num='3',name='IN+'),
                   Pin(num='4',name='VEE'), Pin(num='5',name='OS2'), Pin(num='6',name='OUT'),
                   Pin(num='7',name='VCC'), Pin(num='8',name='NC')])
ads1115 = Part(tool=SKIDL, name='ADS1115', ref='U2', footprint='Package_SO:TSSOP-10_3x3mm_P0.5mm',
               pins=[Pin(num=str(i), name=f'P{i}') for i in range(1, 11)])
r1 = Part('Device', 'R', value='10k', footprint='Resistor_SMD:R_0603_1608Metric')

vin += lm741['IN+']
lm741['OUT'] += vout
vcc += lm741['VCC']
gnd += lm741['VEE']
vcc += ads1115['8']
gnd += ads1115['3']
vout += ads1115['4']
r1[1] += vcc
r1[2] += vin
""",
            ),
            ("ddr1_example", ddr_source),
        ]

        for name, source in circuits:
            with self.subTest(case=name):
                self.run_case(name, source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
