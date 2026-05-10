# Wiring and Pinout Blueprint

## ESP32 Pin Allocation

| Module | ESP32 Pin | Type |
|---|---|---|
| pH sensor analog output | GPIO 34 | Analog input |
| Turbidity analog output | GPIO 35 | Analog input |
| Flow sensor signal | GPIO 27 | Digital interrupt |
| DS18B20 data | GPIO 4 | OneWire digital |
| OLED SDA | GPIO 21 | I2C SDA |
| OLED SCL | GPIO 22 | I2C SCL |
| Green LED | GPIO 16 | Digital output |
| Yellow LED | GPIO 17 | Digital output |
| Red LED | GPIO 18 | Digital output |
| Buzzer | GPIO 19 | Digital output |
| Push button | GPIO 25 | Digital input |
| Optional MQ-135 | GPIO 32 | Analog input |
| Optional ACS712 | GPIO 33 | Analog input |

## OLED I2C Wiring

```text
OLED VCC → 3.3V
OLED GND → GND
OLED SDA → GPIO 21
OLED SCL → GPIO 22
```

## pH Sensor Wiring

```text
pH Module VCC → 5V
pH Module GND → GND
pH Module AO  → GPIO 34
```

Warning: ESP32 ADC input should not exceed 3.3V. If the sensor output can reach 5V, use a voltage divider.

## Turbidity Sensor Wiring

```text
Turbidity VCC → 5V
Turbidity GND → GND
Turbidity AO  → GPIO 35
```

## Flow Sensor Wiring

```text
Flow Sensor VCC    → 5V
Flow Sensor GND    → GND
Flow Sensor Signal → GPIO 27
```

## DS18B20 Wiring

```text
DS18B20 VCC  → 3.3V
DS18B20 GND  → GND
DS18B20 DATA → GPIO 4
DATA → 4.7kΩ resistor → VCC
```

## LED Indicator Wiring

```text
GPIO 16 → 220Ω resistor → Green LED → GND
GPIO 17 → 220Ω resistor → Yellow LED → GND
GPIO 18 → 220Ω resistor → Red LED → GND
```

## Buzzer Wiring

```text
GPIO 19 → Buzzer +
GND     → Buzzer -
```

Use a transistor driver if your buzzer needs higher current.

## Text Wiring Diagram

```text
                ┌────────────────────────┐
                │         ESP32          │
pH AO       ───▶│ GPIO34 ADC             │
Turb AO     ───▶│ GPIO35 ADC             │
Flow Signal ───▶│ GPIO27 Interrupt       │
Temp Data   ───▶│ GPIO4 OneWire          │
OLED SDA    ───▶│ GPIO21 I2C             │
OLED SCL    ───▶│ GPIO22 I2C             │
Green LED   ◀───│ GPIO16                 │
Yellow LED  ◀───│ GPIO17                 │
Red LED     ◀───│ GPIO18                 │
Buzzer      ◀───│ GPIO19                 │
Button      ───▶│ GPIO25                 │
Wi-Fi       ◀──▶│ Backend / Dashboard    │
                └────────────────────────┘
```
