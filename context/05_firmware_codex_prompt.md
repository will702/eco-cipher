# Codex Prompt — ESP32 Firmware

```text
Create ESP32 Arduino firmware for Eco-Cipher Edge Verifier.

Hardware:
- ESP32 DevKit V1
- pH sensor on GPIO34 analog
- turbidity sensor on GPIO35 analog
- water flow sensor on GPIO27 interrupt
- DS18B20 temperature sensor on GPIO4
- OLED I2C SDA GPIO21, SCL GPIO22
- green LED GPIO16
- yellow LED GPIO17
- red LED GPIO18
- buzzer GPIO19
- button GPIO25

Firmware requirements:
- Connect to Wi-Fi
- Read all sensors every 5 seconds
- Calculate flow rate and total volume
- Classify status as VERIFIED, WARNING, or ANOMALY
- Display values on OLED
- Turn on LED based on status
- Beep buzzer for anomaly
- Create JSON payload
- Generate a SHA256 hash from the payload
- Send payload to an HTTP endpoint
- Add clean modular functions and comments
- Include placeholder constants for Wi-Fi SSID, password, and API endpoint
- Make the code easy to modify for Supabase/Firebase/Node backend
```
