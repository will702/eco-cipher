# Demo Flow — Eco-Cipher Edge Verifier

## Scenario

Anonymous Wastewater Exchange with Carbon Impact Recommendation.

Factory A produces wastewater. The Edge Verifier reads physical parameters and sends verified data to Eco-Cipher. The AI matchmaker identifies Factory B as a compatible receiver. The platform displays a verified, privacy-preserving match.

## Demo Sequence

### Step 1 — Boot

OLED:
```text
BOOTING...
Eco-Cipher Edge
```

### Step 2 — Connect

OLED:
```text
WiFi Connected
Device: EC-EDGE-001
```

### Step 3 — Read

Put sensor into sample liquid.

OLED:
```text
Reading sensors...
```

### Step 4 — Validate

LED status:
```text
Green = verified
Yellow = warning
Red = anomaly
```

### Step 5 — Upload

OLED:
```text
Payload uploaded
Hash generated
```

### Step 6 — Dashboard

Dashboard:
```text
Factory A stream verified
AI match found
Carbon impact estimated
```

## Demo Samples

| Sample | Composition | Expected Result |
|---|---|---|
| A | Clear water | Verified stream |
| B | Water + tea/coffee | Organic/turbid waste |
| C | Water + vinegar/soap | Warning/anomaly |
