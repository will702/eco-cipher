# Edge Validation Rules

These are demo thresholds for the prototype, not regulatory standards.

## Status Table

| Parameter | Verified | Warning | Anomaly |
|---|---|---|---|
| pH | 6.5–8.5 | 5.5–6.5 or 8.5–9.5 | <5.5 or >9.5 |
| Turbidity | Low-medium | High | Extreme / sensor error |
| Flow | >0.2 L/min | Unstable | 0 while active |
| Temperature | 20–40°C | 40–50°C | >50°C or sensor error |

## Status Logic

### VERIFIED

Conditions:
- pH between 6.5 and 8.5
- turbidity below warning threshold
- flow rate above minimum threshold
- temperature within expected range

Output:
```text
edge_status = "VERIFIED"
LED = green
buzzer = off
```

### WARNING

Conditions:
- pH slightly outside normal range
- turbidity medium-high
- temperature slightly abnormal

Output:
```text
edge_status = "WARNING"
LED = yellow
buzzer = short beep
```

### ANOMALY

Conditions:
- pH extremely low/high
- flow rate zero during active session
- sensor disconnected
- sudden impossible value jump
- missing payload

Output:
```text
edge_status = "ANOMALY"
LED = red
buzzer = repeated beep
```

## Data Quality Score

Suggested scoring:

```text
data_quality_score =
0.30 sensor_completeness
+ 0.25 normal_range_score
+ 0.20 signal_stability
+ 0.15 device_uptime
+ 0.10 transmission_success
```
