#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "mbedtls/sha256.h"

// Network and device constants.
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_ENDPOINT = "https://example.com/mock/edge-payload";
const char* DEVICE_ID = "EC-EDGE-001";
const char* FACTORY_ALIAS = "Factory_A";

// ESP32 pin allocation from the blueprint package.
const int PH_PIN = 34;
const int TURBIDITY_PIN = 35;
const int FLOW_PIN = 27;
const int ONE_WIRE_PIN = 4;
const int OLED_SDA = 21;
const int OLED_SCL = 22;
const int GREEN_LED_PIN = 16;
const int YELLOW_LED_PIN = 17;
const int RED_LED_PIN = 18;
const int BUZZER_PIN = 19;
const int BUTTON_PIN = 25;
const int MQ135_PIN = 32;
const int ENERGY_PIN = 33;

const unsigned long READ_INTERVAL_MS = 5000;
const float FLOW_CALIBRATION_FACTOR = 7.5; // YF-S201 typical pulses/sec per L/min.
const float PH_ADC_TO_VOLTAGE = 3.3 / 4095.0;
const float PH_NEUTRAL_VOLTAGE = 2.5;
const float PH_SLOPE = -5.7;
const float ADC_MAX_SAFE_VOLTAGE = 3.3;
const float ANALOG_DIVIDER_RATIO = 0.66; // 5V sensor output scaled to ESP32-safe ADC range.

const int TURBIDITY_WARNING_RAW = 650;
const int TURBIDITY_ANOMALY_RAW = 900;
const float FLOW_MIN_LPM = 0.2;
const int GAS_WARNING_RAW = 550;
const int GAS_ANOMALY_RAW = 780;
const float ACS712_ZERO_VOLTAGE = 1.65;
const float ACS712_SENSITIVITY_V_PER_A = 0.185;
const float LINE_VOLTAGE_ESTIMATE = 220.0;

volatile unsigned long flowPulseCount = 0;
unsigned long lastReadAt = 0;
float totalVolumeLiters = 0.0;

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature temperatureSensors(&oneWire);
Adafruit_SSD1306 display(128, 64, &Wire, -1);

enum EdgeStatus {
  VERIFIED,
  WARNING,
  ANOMALY
};

struct SensorFrame {
  float ph;
  int turbidityRaw;
  float flowRateLpm;
  float temperatureC;
  int gasRaw;
  float gasRiskScore;
  float energyCurrentA;
  float energyPowerW;
  float estimatedVolumeL;
  EdgeStatus status;
  bool anomalyFlag;
  float qualityScore;
  float carbonContextScore;
  float aiMatchConfidence;
  String aiWasteClass;
  String anomalyReasons;
};

void IRAM_ATTR onFlowPulse() {
  flowPulseCount++;
}

String statusToString(EdgeStatus status) {
  if (status == VERIFIED) return "VERIFIED";
  if (status == WARNING) return "WARNING";
  return "ANOMALY";
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("BOOTING...");
  display.println("Eco-Cipher Edge");
  display.display();

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
  }
}

float readPh() {
  int raw = analogRead(PH_PIN);
  float voltage = raw * PH_ADC_TO_VOLTAGE;
  float sensorVoltage = voltage / ANALOG_DIVIDER_RATIO;
  return 7.0 + ((sensorVoltage - PH_NEUTRAL_VOLTAGE) * PH_SLOPE);
}

int readTurbidityRaw() {
  return analogRead(TURBIDITY_PIN);
}

int readGasRaw() {
  return analogRead(MQ135_PIN);
}

float readEnergyCurrentA() {
  int raw = analogRead(ENERGY_PIN);
  float voltage = (raw * PH_ADC_TO_VOLTAGE) / ANALOG_DIVIDER_RATIO;
  float current = (voltage - ACS712_ZERO_VOLTAGE) / ACS712_SENSITIVITY_V_PER_A;
  return abs(current);
}

float readTemperatureC() {
  temperatureSensors.requestTemperatures();
  return temperatureSensors.getTempCByIndex(0);
}

float calculateFlowRateLpm() {
  noInterrupts();
  unsigned long pulses = flowPulseCount;
  flowPulseCount = 0;
  interrupts();

  float seconds = READ_INTERVAL_MS / 1000.0;
  float pulsesPerSecond = pulses / seconds;
  float lpm = pulsesPerSecond / FLOW_CALIBRATION_FACTOR;
  totalVolumeLiters += lpm * (seconds / 60.0);
  return lpm;
}

String buildAnomalyReasons(float ph, int turbidityRaw, float flowRateLpm, float temperatureC, int gasRaw, float energyPowerW) {
  String reasons = "";
  if (ph < 5.5 || ph > 9.5) reasons += "ph_extreme;";
  if (turbidityRaw >= TURBIDITY_ANOMALY_RAW) reasons += "turbidity_extreme;";
  if (flowRateLpm <= 0.05) reasons += "zero_flow;";
  if (temperatureC == DEVICE_DISCONNECTED_C) reasons += "temperature_sensor_error;";
  if (temperatureC > 50.0) reasons += "temperature_high;";
  if (gasRaw >= GAS_ANOMALY_RAW) reasons += "gas_risk_high;";
  if (energyPowerW <= 1.0) reasons += "energy_context_missing;";
  if (reasons.length() == 0) reasons = "none";
  return reasons;
}

EdgeStatus classifyStatus(float ph, int turbidityRaw, float flowRateLpm, float temperatureC, int gasRaw) {
  bool tempError = temperatureC == DEVICE_DISCONNECTED_C || temperatureC > 50.0;
  bool gasError = gasRaw >= GAS_ANOMALY_RAW;
  bool anomaly = ph < 5.5 || ph > 9.5 || turbidityRaw >= TURBIDITY_ANOMALY_RAW || flowRateLpm <= 0.05 || tempError || gasError;
  if (anomaly) return ANOMALY;

  bool warning = ph < 6.5 || ph > 8.5 || turbidityRaw >= TURBIDITY_WARNING_RAW || flowRateLpm < FLOW_MIN_LPM || temperatureC > 40.0 || gasRaw >= GAS_WARNING_RAW;
  if (warning) return WARNING;

  return VERIFIED;
}

float calculateQualityScore(const SensorFrame& frame) {
  float sensorCompleteness = frame.temperatureC == DEVICE_DISCONNECTED_C ? 0.75 : 1.0;
  float normalRangeScore = frame.status == VERIFIED ? 1.0 : frame.status == WARNING ? 0.62 : 0.28;
  float stability = frame.turbidityRaw >= TURBIDITY_ANOMALY_RAW ? 0.45 : frame.turbidityRaw >= TURBIDITY_WARNING_RAW ? 0.72 : 0.92;
  float uptime = 0.96;
  float transmission = WiFi.status() == WL_CONNECTED ? 0.98 : 0.2;

  return 0.30 * sensorCompleteness + 0.25 * normalRangeScore + 0.20 * stability + 0.15 * uptime + 0.10 * transmission;
}

float calculateGasRiskScore(int gasRaw) {
  return constrain(gasRaw / 1023.0, 0.0, 1.0);
}

float calculateCarbonContextScore(const SensorFrame& frame) {
  float flowContext = constrain(frame.flowRateLpm / 5.0, 0.0, 1.0);
  float energyContext = constrain(frame.energyPowerW / 1000.0, 0.0, 1.0);
  float gasPenalty = 1.0 - frame.gasRiskScore;
  return 0.35 * flowContext + 0.30 * energyContext + 0.20 * gasPenalty + 0.15 * frame.qualityScore;
}

String classifyWasteForAi(const SensorFrame& frame) {
  if (frame.status == ANOMALY) return "manual_review_required";
  if (frame.gasRiskScore > 0.55) return "emission_sensitive_stream";
  if (frame.turbidityRaw >= TURBIDITY_WARNING_RAW) return "organic_turbid_wastewater";
  if (frame.energyPowerW > 600.0) return "energy_linked_process_stream";
  return "neutral_wastewater_stream";
}

float calculateAiMatchConfidence(const SensorFrame& frame) {
  float statusFactor = frame.status == VERIFIED ? 0.96 : frame.status == WARNING ? 0.72 : 0.38;
  return constrain(0.55 * frame.qualityScore + 0.25 * frame.carbonContextScore + 0.20 * statusFactor, 0.0, 1.0);
}

SensorFrame readSensors() {
  SensorFrame frame;
  frame.ph = readPh();
  frame.turbidityRaw = readTurbidityRaw();
  frame.flowRateLpm = calculateFlowRateLpm();
  frame.temperatureC = readTemperatureC();
  frame.gasRaw = readGasRaw();
  frame.gasRiskScore = calculateGasRiskScore(frame.gasRaw);
  frame.energyCurrentA = readEnergyCurrentA();
  frame.energyPowerW = frame.energyCurrentA * LINE_VOLTAGE_ESTIMATE;
  frame.estimatedVolumeL = totalVolumeLiters;
  frame.status = classifyStatus(frame.ph, frame.turbidityRaw, frame.flowRateLpm, frame.temperatureC, frame.gasRaw);
  frame.anomalyFlag = frame.status == ANOMALY;
  frame.qualityScore = calculateQualityScore(frame);
  frame.carbonContextScore = calculateCarbonContextScore(frame);
  frame.aiWasteClass = classifyWasteForAi(frame);
  frame.aiMatchConfidence = calculateAiMatchConfidence(frame);
  frame.anomalyReasons = buildAnomalyReasons(frame.ph, frame.turbidityRaw, frame.flowRateLpm, frame.temperatureC, frame.gasRaw, frame.energyPowerW);
  return frame;
}

String sha256(String input) {
  byte hash[32];
  mbedtls_sha256_context ctx;
  mbedtls_sha256_init(&ctx);
  mbedtls_sha256_starts(&ctx, 0);
  mbedtls_sha256_update(&ctx, (const unsigned char*)input.c_str(), input.length());
  mbedtls_sha256_finish(&ctx, hash);
  mbedtls_sha256_free(&ctx);

  String output = "";
  for (byte index = 0; index < 32; index++) {
    if (hash[index] < 16) output += "0";
    output += String(hash[index], HEX);
  }
  return output;
}

String buildPayload(const SensorFrame& frame) {
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["factory_alias"] = FACTORY_ALIAS;
  doc["timestamp"] = String(millis());
  doc["sensor_type"] = "wastewater_edge_verifier";
  doc["ph"] = round(frame.ph * 100.0) / 100.0;
  doc["turbidity_raw"] = frame.turbidityRaw;
  doc["flow_rate_lpm"] = round(frame.flowRateLpm * 100.0) / 100.0;
  doc["temperature_c"] = round(frame.temperatureC * 10.0) / 10.0;
  doc["gas_raw"] = frame.gasRaw;
  doc["gas_risk_score"] = round(frame.gasRiskScore * 100.0) / 100.0;
  doc["energy_current_a"] = round(frame.energyCurrentA * 100.0) / 100.0;
  doc["energy_power_w"] = round(frame.energyPowerW * 10.0) / 10.0;
  doc["estimated_volume_l"] = round(frame.estimatedVolumeL * 100.0) / 100.0;
  doc["edge_status"] = statusToString(frame.status);
  doc["anomaly_flag"] = frame.anomalyFlag;
  doc["data_quality_score"] = round(frame.qualityScore * 100.0) / 100.0;
  doc["carbon_context_score"] = round(frame.carbonContextScore * 100.0) / 100.0;
  doc["ai_waste_class"] = frame.aiWasteClass;
  doc["ai_match_confidence"] = round(frame.aiMatchConfidence * 100.0) / 100.0;
  doc["anomaly_reasons"] = frame.anomalyReasons;

  String withoutHash;
  serializeJson(doc, withoutHash);
  doc["payload_hash"] = sha256(withoutHash);

  String payload;
  serializeJson(doc, payload);
  return payload;
}

void updateOutputs(const SensorFrame& frame) {
  digitalWrite(GREEN_LED_PIN, frame.status == VERIFIED ? HIGH : LOW);
  digitalWrite(YELLOW_LED_PIN, frame.status == WARNING ? HIGH : LOW);
  digitalWrite(RED_LED_PIN, frame.status == ANOMALY ? HIGH : LOW);

  if (frame.status == ANOMALY) {
    tone(BUZZER_PIN, 2200, 350);
  } else if (frame.status == WARNING) {
    tone(BUZZER_PIN, 1500, 120);
  } else {
    noTone(BUZZER_PIN);
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.print("Device: ");
  display.println(DEVICE_ID);
  display.print("Status: ");
  display.println(statusToString(frame.status));
  display.print("pH ");
  display.print(frame.ph, 2);
  display.print("  T ");
  display.print(frame.temperatureC, 1);
  display.println("C");
  display.print("Turb ");
  display.print(frame.turbidityRaw);
  display.print(" Flow ");
  display.print(frame.flowRateLpm, 1);
  display.println("L/m");
  display.print("Q ");
  display.print(frame.qualityScore * 100, 0);
  display.print("% AI ");
  display.print(frame.aiMatchConfidence * 100, 0);
  display.println("%");
  display.display();
}

void sendPayload(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.POST(payload);
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), onFlowPulse, RISING);

  Wire.begin(OLED_SDA, OLED_SCL);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  temperatureSensors.begin();
  connectWiFi();
}

void loop() {
  if (millis() - lastReadAt < READ_INTERVAL_MS && digitalRead(BUTTON_PIN) == HIGH) {
    return;
  }

  lastReadAt = millis();
  SensorFrame frame = readSensors();
  updateOutputs(frame);
  String payload = buildPayload(frame);
  Serial.println(payload);
  sendPayload(payload);
}
