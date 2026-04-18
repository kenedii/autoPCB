from skidl import *

# DDR1 SDRAM Module - 184-pin DIMM
# 8 x 512Mb DDR1 chips for 512MB module (64Mx8 each)

# Power nets
VDD = Net('VDD')   # 2.5V core voltage
VDDQ = Net('VDDQ') # 2.5V I/O voltage
VREF = Net('VREF') # 1.25V reference voltage
VTT = Net('VTT')   # 1.25V termination voltage
GND = Net('GND')   # Ground

# Control nets
CK = Net('CK')     # Clock positive
CKn = Net('CKn')   # Clock negative
CKE = Net('CKE')   # Clock enable
ODT = Net('ODT')   # On-die termination
RASn = Net('RASn') # Row address strobe
CASn = Net('CASn') # Column address strobe
WEn = Net('WEn')   # Write enable

# Address nets
A0 = Net('A0')
A1 = Net('A1')
A2 = Net('A2')
A3 = Net('A3')
A4 = Net('A4')
A5 = Net('A5')
A6 = Net('A6')
A7 = Net('A7')
A8 = Net('A8')
A9 = Net('A9')
A10 = Net('A10')
A11 = Net('A11')
A12 = Net('A12')
BA0 = Net('BA0')   # Bank address 0
BA1 = Net('BA1')   # Bank address 1

# Data nets (64-bit data bus)
DQ0 = Net('DQ0')
DQ1 = Net('DQ1')
DQ2 = Net('DQ2')
DQ3 = Net('DQ3')
DQ4 = Net('DQ4')
DQ5 = Net('DQ5')
DQ6 = Net('DQ6')
DQ7 = Net('DQ7')
DQ8 = Net('DQ8')
DQ9 = Net('DQ9')
DQ10 = Net('DQ10')
DQ11 = Net('DQ11')
DQ12 = Net('DQ12')
DQ13 = Net('DQ13')
DQ14 = Net('DQ14')
DQ15 = Net('DQ15')
DQ16 = Net('DQ16')
DQ17 = Net('DQ17')
DQ18 = Net('DQ18')
DQ19 = Net('DQ19')
DQ20 = Net('DQ20')
DQ21 = Net('DQ21')
DQ22 = Net('DQ22')
DQ23 = Net('DQ23')
DQ24 = Net('DQ24')
DQ25 = Net('DQ25')
DQ26 = Net('DQ26')
DQ27 = Net('DQ27')
DQ28 = Net('DQ28')
DQ29 = Net('DQ29')
DQ30 = Net('DQ30')
DQ31 = Net('DQ31')
DQ32 = Net('DQ32')
DQ33 = Net('DQ33')
DQ34 = Net('DQ34')
DQ35 = Net('DQ35')
DQ36 = Net('DQ36')
DQ37 = Net('DQ37')
DQ38 = Net('DQ38')
DQ39 = Net('DQ39')
DQ40 = Net('DQ40')
DQ41 = Net('DQ41')
DQ42 = Net('DQ42')
DQ43 = Net('DQ43')
DQ44 = Net('DQ44')
DQ45 = Net('DQ45')
DQ46 = Net('DQ46')
DQ47 = Net('DQ47')
DQ48 = Net('DQ48')
DQ49 = Net('DQ49')
DQ50 = Net('DQ50')
DQ51 = Net('DQ51')
DQ52 = Net('DQ52')
DQ53 = Net('DQ53')
DQ54 = Net('DQ54')
DQ55 = Net('DQ55')
DQ56 = Net('DQ56')
DQ57 = Net('DQ57')
DQ58 = Net('DQ58')
DQ59 = Net('DQ59')
DQ60 = Net('DQ60')
DQ61 = Net('DQ61')
DQ62 = Net('DQ62')
DQ63 = Net('DQ63')

# Data strobe nets (one per byte)
DQS0 = Net('DQS0')
DQS1 = Net('DQS1')
DQS2 = Net('DQS2')
DQS3 = Net('DQS3')
DQS4 = Net('DQS4')
DQS5 = Net('DQS5')
DQS6 = Net('DQS6')
DQS7 = Net('DQS7')

# Data mask nets (one per byte)
DM0 = Net('DM0')
DM1 = Net('DM1')
DM2 = Net('DM2')
DM3 = Net('DM3')
DM4 = Net('DM4')
DM5 = Net('DM5')
DM6 = Net('DM6')
DM7 = Net('DM7')

# Chip select nets (one per rank, tied low for single rank)
CSn = Net('CSn')

# Serial Presence Detect EEPROM
U_SPD = Part('Memory_EEPROM', 'AT24C02', footprint='Package_SO:SOIC-8_3.9x4.9mm_P1.27mm')
U_SPD.A0 += GND
U_SPD.A1 += GND
U_SPD.A2 += GND
U_SPD.VSS += GND
U_SPD.VCC += VDDQ
U_SPD.WP += GND  # Write protect disabled

# I2C interface for SPD
SCL = Net('SCL')
SDA = Net('SDA')
U_SPD.SCL += SCL
U_SPD.SDA += SDA

# Pull-up resistors for I2C
R_SCL = Part('Device', 'R', value='4.7k', footprint='Resistor_SMD:R_0603_1608Metric')
R_SDA = Part('Device', 'R', value='4.7k', footprint='Resistor_SMD:R_0603_1608Metric')
R_SCL[1] += SCL
R_SCL[2] += VDDQ
R_SDA[1] += SDA
R_SDA[2] += VDDQ

# DDR1 SDRAM Chips (8 chips for 64-bit data bus)
# Each chip: 512Mb (64Mx8) DDR1 SDRAM
ddr_chips = []
for i in range(8):
    chip = Part('Memory_RAM', 'MT46V64M8', footprint='Package_SO:TSOP-II-66_22.2x10.16mm_P0.4mm')
    ddr_chips.append(chip)
    
    # Power connections
    chip.VDD += VDD
    chip.VDDQ += VDDQ
    chip.VSS += GND
    chip.VSSQ += GND
    
    # Reference voltage
    chip.VREF += VREF
    
    # Clock
    chip.CK += CK
    chip.CKn += CKn
    
    # Control signals
    chip.CKE += CKE
    chip.ODT += ODT
    chip.RASn += RASn
    chip.CASn += CASn
    chip.WEn += WEn
    chip.CSn += CSn
    
    # Address bus (shared across all chips)
    chip.A0 += A0
    chip.A1 += A1
    chip.A2 += A2
    chip.A3 += A3
    chip.A4 += A4
    chip.A5 += A5
    chip.A6 += A6
    chip.A7 += A7
    chip.A8 += A8
    chip.A9 += A9
    chip.A10 += A10
    chip.A11 += A11
    chip.A12 += A12
    chip.BA0 += BA0
    chip.BA1 += BA1

# Data bus assignments (8 bits per chip)
# Chip 0: DQ0-DQ7
ddr_chips[0].DQ0 += DQ0
ddr_chips[0].DQ1 += DQ1
ddr_chips[0].DQ2 += DQ2
ddr_chips[0].DQ3 += DQ3
ddr_chips[0].DQ4 += DQ4
ddr_chips[0].DQ5 += DQ5
ddr_chips[0].DQ6 += DQ6
ddr_chips[0].DQ7 += DQ7
ddr_chips[0].DQS += DQS0
ddr_chips[0].DM += DM0

# Chip 1: DQ8-DQ15
ddr_chips[1].DQ0 += DQ8
ddr_chips[1].DQ1 += DQ9
ddr_chips[1].DQ2 += DQ10
ddr_chips[1].DQ3 += DQ11
ddr_chips[1].DQ4 += DQ12
ddr_chips[1].DQ5 += DQ13
ddr_chips[1].DQ6 += DQ14
ddr_chips[1].DQ7 += DQ15
ddr_chips[1].DQS += DQS1
ddr_chips[1].DM += DM1

# Chip 2: DQ16-DQ23
ddr_chips[2].DQ0 += DQ16
ddr_chips[2].DQ1 += DQ17
ddr_chips[2].DQ2 += DQ18
ddr_chips[2].DQ3 += DQ19
ddr_chips[2].DQ4 += DQ20
ddr_chips[2].DQ5 += DQ21
ddr_chips[2].DQ6 += DQ22
ddr_chips[2].DQ7 += DQ23
ddr_chips[2].DQS += DQS2
ddr_chips[2].DM += DM2

# Chip 3: DQ24-DQ31
ddr_chips[3].DQ0 += DQ24
ddr_chips[3].DQ1 += DQ25
ddr_chips[3].DQ2 += DQ26
ddr_chips[3].DQ3 += DQ27
ddr_chips[3].DQ4 += DQ28
ddr_chips[3].DQ5 += DQ29
ddr_chips[3].DQ6 += DQ30
ddr_chips[3].DQ7 += DQ31
ddr_chips[3].DQS += DQS3
ddr_chips[3].DM += DM3

# Chip 4: DQ32-DQ39
ddr_chips[4].DQ0 += DQ32
ddr_chips[4].DQ1 += DQ33
ddr_chips[4].DQ2 += DQ34
ddr_chips[4].DQ3 += DQ35
ddr_chips[4].DQ4 += DQ36
ddr_chips[4].DQ5 += DQ37
ddr_chips[4].DQ6 += DQ38
ddr_chips[4].DQ7 += DQ39
ddr_chips[4].DQS += DQS4
ddr_chips[4].DM += DM4

# Chip 5: DQ40-DQ47
ddr_chips[5].DQ0 += DQ40
ddr_chips[5].DQ1 += DQ41
ddr_chips[5].DQ2 += DQ42
ddr_chips[5].DQ3 += DQ43
ddr_chips[5].DQ4 += DQ44
ddr_chips[5].DQ5 += DQ45
ddr_chips[5].DQ6 += DQ46
ddr_chips[5].DQ7 += DQ47
ddr_chips[5].DQS += DQS5
ddr_chips[5].DM += DM5

# Chip 6: DQ48-DQ55
ddr_chips[6].DQ0 += DQ48
ddr_chips[6].DQ1 += DQ49
ddr_chips[6].DQ2 += DQ50
ddr_chips[6].DQ3 += DQ51
ddr_chips[6].DQ4 += DQ52
ddr_chips[6].DQ5 += DQ53
ddr_chips[6].DQ6 += DQ54
ddr_chips[6].DQ7 += DQ55
ddr_chips[6].DQS += DQS6
ddr_chips[6].DM += DM6

# Chip 7: DQ56-DQ63
ddr_chips[7].DQ0 += DQ56
ddr_chips[7].DQ1 += DQ57
ddr_chips[7].DQ2 += DQ58
ddr_chips[7].DQ3 += DQ59
ddr_chips[7].DQ4 += DQ60
ddr_chips[7].DQ5 += DQ61
ddr_chips[7].DQ6 += DQ62
ddr_chips[7].DQ7 += DQ63
ddr_chips[7].DQS += DQS7
ddr_chips[7].DM += DM7

# Decoupling capacitors for each DDR chip (0.1μF)
for i in range(8):
    for j in range(4):  # 4 decoupling caps per chip
        cap = Part('Device', 'C', value='0.1u', footprint='Capacitor_SMD:C_0603_1608Metric')
        cap[1] += VDD
        cap[2] += GND

# Bulk capacitors for power planes
C_bulk1 = Part('Device', 'C', value='10u', footprint='Capacitor_Tantalum_SMD:CP_EIA-3216-18_Kemet-A')
C_bulk2 = Part('Device', 'C', value='10u', footprint='Capacitor_Tantalum_SMD:CP_EIA-3216-18_Kemet-A')
C_bulk3 = Part('Device', 'C', value='10u', footprint='Capacitor_Tantalum_SMD:CP_EIA-3216-18_Kemet-A')
C_bulk1[1] += VDD
C_bulk1[2] += GND
C_bulk2[1] += VDDQ
C_bulk2[2] += GND
C_bulk3[1] += VTT
C_bulk3[2] += GND

# VREF generation (resistive divider)
R_vref1 = Part('Device', 'R', value='1k', footprint='Resistor_SMD:R_0603_1608Metric')
R_vref2 = Part('Device', 'R', value='1k', footprint='Resistor_SMD:R_0603_1608Metric')
R_vref1[1] += VDDQ
R_vref1[2] += VREF
R_vref2[1] += VREF
R_vref2[2] += GND

# VTT generation (resistive divider for simple implementation)
R_vtt1 = Part('Device', 'R', value='1k', footprint='Resistor_SMD:R_0603_1608Metric')
R_vtt2 = Part('Device', 'R', value='1k', footprint='Resistor_SMD:R_0603_1608Metric')
R_vtt1[1] += VDDQ
R_vtt1[2] += VTT
R_vtt2[1] += VTT
R_vtt2[2] += GND

# Termination resistors for data lines (optional, 22Ω)
for i in range(8):  # One per byte
    R_term = Part('Device', 'R', value='22', footprint='Resistor_SMD:R_0603_1608Metric')
    # Connect between DQS and VTT (simplified termination)
    R_term[1] += [DQS0, DQS1, DQS2, DQS3, DQS4, DQS5, DQS6, DQS7][i]
    R_term[2] += VTT

# DIMM connector (184-pin)
conn = Part('Connector', 'DDR1_DIMM_184pin', footprint='Connector_PCBEdge:DDR1_DIMM_184pin')
# Note: In a real implementation, each pin would be connected to the corresponding net
# This is a simplified representation

# Connect key signals to connector
# Address/Command
conn.A0 += A0
conn.A1 += A1
conn.A2 += A2
conn.A3 += A3
conn.A4 += A4
conn.A5 += A5
conn.A6 += A6
conn.A7 += A7
conn.A8 += A8
conn.A9 += A9
conn.A10 += A10
conn.A11 += A11
conn.A12 += A12
conn.BA0 += BA0
conn.BA1 += BA1
conn.RASn += RASn
conn.CASn += CASn
conn.WEn += WEn

# Data bus
conn.DQ0 += DQ0
conn.DQ1 += DQ1
conn.DQ2 += DQ2
conn.DQ3 += DQ3
conn.DQ4 += DQ4
conn.DQ5 += DQ5
conn.DQ6 += DQ6
conn.DQ7 += DQ7
conn.DQ8 += DQ8
conn.DQ9 += DQ9
conn.DQ10 += DQ10
conn.DQ11 += DQ11
conn.DQ12 += DQ12
conn.DQ13 += DQ13
conn.DQ14 += DQ14
conn.DQ15 += DQ15
conn.DQ16 += DQ16
conn.DQ17 += DQ17
conn.DQ18 += DQ18
conn.DQ19 += DQ19
conn.DQ20 += DQ20
conn.DQ21 += DQ21
conn.DQ22 += DQ22
conn.DQ23 += DQ23
conn.DQ24 += DQ24
conn.DQ25 += DQ25
conn.DQ26 += DQ26
conn.DQ27 += DQ27
conn.DQ28 += DQ28
conn.DQ29 += DQ29
conn.DQ30 += DQ30
conn.DQ31 += DQ31
conn.DQ32 += DQ32
conn.DQ33 += DQ33
conn.DQ34 += DQ34