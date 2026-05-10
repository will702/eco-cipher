"""FreeCAD model generator for the Eco-Cipher Edge Verifier prototype.

Run from FreeCAD's Python console, as a macro, or with FreeCADCmd:

    /Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd cad/eco_cipher_freecad_model.py

The script creates a detailed 120 x 80 x 40 mm enclosure assembly with wet/dry
separation, internal ESP32 electronics, voltage protection, color-coded wiring,
power regulation, terminal blocks, all sensor modules, edge-AI callouts, and
sample plumbing. It exports FCStd, STEP, and STL outputs when the FreeCAD
runtime supports those exporters.
"""

from __future__ import annotations

from pathlib import Path

import FreeCAD as App
import Part

try:
    import Mesh
except Exception:  # pragma: no cover - Mesh is FreeCAD-runtime dependent.
    Mesh = None


ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "generated"

LENGTH = 120.0
WIDTH = 80.0
HEIGHT = 40.0
WALL = 3.0
LID_THICKNESS = 3.0
CORNER_RADIUS = 5.0

PALETTE = {
    "enclosure": (0.16, 0.20, 0.18),
    "fluid": (0.10, 0.62, 0.72),
    "sensor": (0.88, 0.62, 0.12),
    "controller": (0.02, 0.22, 0.16),
    "power": (0.90, 0.24, 0.06),
    "indicator": (0.42, 0.30, 0.82),
    "data": (0.08, 0.34, 0.84),
    "safe": (0.0, 0.8, 0.45),
    "warning": (0.95, 0.62, 0.12),
    "anomaly": (0.75, 0.12, 0.12),
}


def vec(x: float, y: float, z: float) -> App.Vector:
    return App.Vector(x, y, z)


def add_box(doc: App.Document, name: str, shape: Part.Shape, color: tuple[float, float, float], transparency: int = 0):
    obj = doc.addObject("Part::Feature", name)
    obj.Shape = shape
    if getattr(obj, "ViewObject", None) is not None:
        obj.ViewObject.ShapeColor = color
        obj.ViewObject.Transparency = transparency
    return obj


def rounded_box(length: float, width: float, height: float, radius: float) -> Part.Shape:
    base = Part.makeBox(length - 2 * radius, width, height, vec(radius, 0, 0))
    side = Part.makeBox(length, width - 2 * radius, height, vec(0, radius, 0))
    shape = base.fuse(side)
    for x in (radius, length - radius):
        for y in (radius, width - radius):
            shape = shape.fuse(Part.makeCylinder(radius, height, vec(x, y, 0)))
    return shape.removeSplitter()


def cylinder_cut(diameter: float, height: float, position: App.Vector, axis: App.Vector = vec(0, 0, 1)) -> Part.Shape:
    return Part.makeCylinder(diameter / 2.0, height, position, axis)


def engraved_text(text: str, size: float, position: App.Vector, color=(0.08, 0.11, 0.1)):
    shape = Part.makeCompound([])
    try:
      shape = Part.makeText(text, "Arial", size)
      shape.Placement.Base = position
    except Exception:
      shape = Part.makeBox(max(12.0, len(text) * size * 0.42), 0.35, 0.2, position)
    return shape


def make_body(doc: App.Document):
    outer = rounded_box(LENGTH, WIDTH, HEIGHT, CORNER_RADIUS)
    inner = rounded_box(LENGTH - 2 * WALL, WIDTH - 2 * WALL, HEIGHT, CORNER_RADIUS - 1)
    inner.translate(vec(WALL, WALL, WALL))
    shell = outer.cut(inner)

    # Front face OLED window and LED holes.
    shell = shell.cut(Part.makeBox(47, WALL + 1.5, 18, vec(18, -0.5, 18)))
    for x in (78, 92, 106):
        shell = shell.cut(cylinder_cut(5.5, WALL + 2, vec(x, -1, 25), vec(0, 1, 0)))

    # Side sensor/cable gland ports.
    for idx in range(5):
        shell = shell.cut(cylinder_cut(7.0, WALL + 2, vec(LENGTH - 1, 18 + idx * 11, 22), vec(1, 0, 0)))

    # Lid screw holes.
    for x in (12, LENGTH - 12):
        for y in (12, WIDTH - 12):
            shell = shell.cut(cylinder_cut(3.2, HEIGHT + 2, vec(x, y, -1)))

    body = add_box(doc, "Enclosure body - hollow ABS shell", shell, PALETTE["enclosure"])

    # Internal posts.
    for x in (34, 86):
        for y in (24, 56):
            post = Part.makeCylinder(4.2, 11, vec(x, y, WALL))
            hole = Part.makeCylinder(1.35, 13, vec(x, y, WALL - 1))
            add_box(doc, "ESP32 M2.5 standoff", post.cut(hole), PALETTE["enclosure"])

    # Rubber gasket channel on top lip.
    gasket_outer = rounded_box(LENGTH - 10, WIDTH - 10, 1.1, 3.5)
    gasket_inner = rounded_box(LENGTH - 18, WIDTH - 18, 1.3, 2.4)
    gasket_inner.translate(vec(4, 4, -0.1))
    gasket = gasket_outer.cut(gasket_inner)
    gasket.translate(vec(5, 5, HEIGHT - 1.4))
    add_box(doc, "Raised gasket channel", gasket, (0.02, 0.04, 0.03))

    # Internal divider makes the electronics/wet sample boundary explicit.
    divider = Part.makeBox(WALL, WIDTH - 12, 23, vec(112, 6, WALL))
    add_box(doc, "Wet dry zone divider wall - separates sample path from electronics", divider, PALETTE["fluid"])

    # Service ribs and drain-oriented feet.
    for y in (10, 67):
        add_box(doc, "Internal enclosure stiffening rib", Part.makeBox(96, 1.4, 8, vec(12, y, WALL)), (0.13, 0.17, 0.15))
    for x in (18, 96):
        add_box(doc, "Raised enclosure foot pad", Part.makeBox(14, 7, 2, vec(x, WIDTH + 1, 2)), (0.10, 0.13, 0.12))

    return body


def make_lid(doc: App.Document):
    lid = rounded_box(LENGTH, WIDTH, LID_THICKNESS, CORNER_RADIUS)
    for x in (12, LENGTH - 12):
        for y in (12, WIDTH - 12):
            lid = lid.cut(cylinder_cut(3.2, LID_THICKNESS + 2, vec(x, y, -1)))
            recess = cylinder_cut(7.2, 1.2, vec(x, y, LID_THICKNESS - 0.8))
            lid = lid.cut(recess)
    lid.translate(vec(0, 95, 8))
    add_box(doc, "Removable lid with countersunk screw recesses", lid, (0.22, 0.27, 0.25))

    label = Part.makeBox(62, 18, 0.8, vec(29, 126, 11.2))
    add_box(doc, "Raised top device label plate", label, (0.82, 0.88, 0.84))

    qr = Part.makeBox(22, 18, 0.9, vec(88, 103, 11.2))
    add_box(doc, "QR and device ID sticker plate", qr, (0.93, 0.95, 0.91))

    gasket = rounded_box(LENGTH - 14, WIDTH - 14, 1.2, 3.2)
    inner = rounded_box(LENGTH - 24, WIDTH - 24, 1.4, 2.4)
    inner.translate(vec(5, 5, -0.1))
    gasket = gasket.cut(inner)
    gasket.translate(vec(7, 102, 11.2))
    add_box(doc, "Lid silicone gasket insert", gasket, (0.02, 0.02, 0.02))


def make_front_components(doc: App.Document):
    bezel = Part.makeBox(52, 4, 24, vec(15.5, -3, 15))
    cutout = Part.makeBox(42, 5, 14, vec(20.5, -4, 20))
    add_box(doc, "OLED raised protective bezel", bezel.cut(cutout), (0.04, 0.06, 0.05))
    add_box(doc, "OLED glass screen", Part.makeBox(42, 1.3, 14, vec(20.5, -4.4, 20)), (0.0, 0.45, 0.35), 18)

    led_specs = [
        ("VALID green lens", 78, PALETTE["safe"]),
        ("WARNING amber lens", 92, PALETTE["warning"]),
        ("ANOMALY red lens", 106, PALETTE["anomaly"]),
    ]
    for name, x, color in led_specs:
        add_box(doc, name, Part.makeCylinder(3.2, 2.2, vec(x, -4, 25), vec(0, 1, 0)), color, 10)
        add_box(doc, f"{name} retaining ring", Part.makeCylinder(4.2, 1.0, vec(x, -3, 25), vec(0, 1, 0)).cut(
            Part.makeCylinder(3.15, 1.2, vec(x, -3.1, 25), vec(0, 1, 0))
        ), (0.02, 0.03, 0.03))


def make_ports_and_labels(doc: App.Document):
    labels = ["PWR", "PH", "TURB", "FLOW", "TEMP", "GAS", "ENERGY"]
    for idx, label in enumerate(labels):
        y = 10 + idx * 9.5
        gland = Part.makeCylinder(5.0, 8, vec(LENGTH + 1, y, 22), vec(1, 0, 0))
        add_box(doc, f"{label} cable gland nut", gland, (0.08, 0.10, 0.09))
        collar = Part.makeCylinder(3.5, 5, vec(LENGTH + 7, y, 22), vec(1, 0, 0))
        port_color = PALETTE["power"] if label == "PWR" else PALETTE["sensor"]
        add_box(doc, f"{label} port insert - {'power' if label == 'PWR' else 'sensor signal'} category", collar, port_color)
        plate = Part.makeBox(13, 6, 0.8, vec(LENGTH - 13.5, y - 3, 31))
        add_box(doc, f"{label} engraved label plate", plate, (0.82, 0.86, 0.80))
        add_box(doc, f"{label} strain relief boot", Part.makeCylinder(3.0, 12, vec(LENGTH + 12, y, 22), vec(1, 0, 0)), (0.02, 0.02, 0.02))


def make_mounting_tabs(doc: App.Document):
    for side, x in (("left", -20), ("right", LENGTH + 8)):
        tab = rounded_box(18, 38, 5, 4)
        tab.translate(vec(x, 21, 0))
        hole = Part.makeCylinder(2.7, 7, vec(x + 9, 40, -1))
        add_box(doc, f"{side} wall mounting tab", tab.cut(hole), (0.18, 0.23, 0.20))


def make_demo_plumbing(doc: App.Document):
    # A compact sample chamber/pipe rig to make the prototype useful in renders.
    pipe_axis = vec(1, 0, 0)
    inlet = Part.makeCylinder(4, 58, vec(-58, 40, 16), pipe_axis)
    outlet = Part.makeCylinder(4, 58, vec(LENGTH, 40, 16), pipe_axis)
    chamber = Part.makeCylinder(12, 36, vec(42, 40, -18), vec(0, 0, 1))
    add_box(doc, "Transparent sample chamber - blue fluid path category", chamber, PALETTE["fluid"], 62)
    add_box(doc, "Inlet tube - blue sample path", inlet, PALETTE["fluid"], 25)
    add_box(doc, "Outlet tube - blue sample path", outlet, PALETTE["fluid"], 25)
    add_box(doc, "Bubble calming baffle", Part.makeBox(1.2, 22, 24, vec(35, 29, -10)), (0.78, 0.88, 0.92), 58)
    add_box(doc, "Sample chamber removable cap", Part.makeCylinder(13, 3, vec(42, 40, 18), vec(0, 0, 1)), (0.08, 0.12, 0.11))
    add_box(doc, "Flow arrow inlet marker", Part.makeBox(9, 1.2, 4, vec(-21, 35, 23)), PALETTE["fluid"])
    add_box(doc, "Flow arrow outlet marker", Part.makeBox(9, 1.2, 4, vec(136, 35, 23)), PALETTE["fluid"])

    for name, x, color in (
        ("pH probe", 46, PALETTE["sensor"]),
        ("Turbidity optical fork", 62, PALETTE["sensor"]),
        ("DS18B20 waterproof probe", 78, PALETTE["sensor"]),
        ("MQ-135 gas intake sniffer", 94, PALETTE["sensor"]),
    ):
        probe = Part.makeCylinder(1.8, 26, vec(x, 40, 10), vec(0, 0, -1))
        add_box(doc, name, probe, color)

    clamp = Part.makeBox(20, 9, 13, vec(128, 33, 10)).cut(
        Part.makeCylinder(3.2, 22, vec(138, 31, 16), vec(0, 1, 0))
    )
    add_box(doc, "ACS712/PZEM energy clamp stand-in - power context category", clamp, PALETTE["power"])


def make_sensor_modules(doc: App.Document):
    modules = [
        ("pH analog conditioner board with BNC", 132, 8, (0.04, 0.22, 0.18), "BNC"),
        ("Turbidity adapter board", 132, 20, (0.18, 0.22, 0.08), "TURB"),
        ("YF-S201 hall flow sensor body", 132, 32, (0.10, 0.36, 0.54), "FLOW"),
        ("DS18B20 sealed junction", 132, 44, (0.18, 0.32, 0.70), "TEMP"),
        ("MQ-135 gas module board", 132, 56, (0.24, 0.24, 0.25), "GAS"),
        ("ACS712 current sensor module", 132, 68, (0.46, 0.36, 0.08), "ENERGY"),
    ]
    for name, x, y, color, label in modules:
        add_box(doc, name, Part.makeBox(25, 9, 2.2, vec(x, y, 28)), color)
        add_box(doc, f"{label} sensor silkscreen label", Part.makeBox(16, 0.7, 4, vec(x + 4, y - 0.8, 30.6)), (0.88, 0.91, 0.84))
        add_box(doc, f"{label} 3-pin service connector", Part.makeBox(7, 3, 4, vec(x + 17, y + 3, 30.4)), (0.02, 0.02, 0.02))

    add_box(doc, "pH BNC metal connector ring", Part.makeCylinder(4.5, 4, vec(130, 12.5, 31), vec(1, 0, 0)), (0.68, 0.70, 0.69))
    add_box(doc, "MQ-135 heater can", Part.makeCylinder(4.2, 4, vec(141, 60.5, 31), vec(0, 0, 1)), (0.62, 0.64, 0.62))
    add_box(doc, "YF-S201 rotor inspection window", Part.makeCylinder(4.0, 1.2, vec(144, 36.5, 31), vec(0, 0, 1)), (0.55, 0.85, 0.92), 40)


def make_wire(doc: App.Document, name: str, start: tuple[float, float, float], end: tuple[float, float, float], color: tuple[float, float, float], diameter: float = 0.9):
    start_v = vec(*start)
    end_v = vec(*end)
    direction = end_v.sub(start_v)
    length = direction.Length
    if length <= 0:
        return None
    wire = Part.makeCylinder(diameter / 2.0, length, start_v, direction)
    return add_box(doc, name, wire, color)


def make_electronics_stack(doc: App.Document):
    # Perfboard and ESP32 controller.
    perf = Part.makeBox(82, 51, 1.6, vec(19, 14, 6))
    add_box(doc, "Internal perfboard carrier - controller zone", perf, PALETTE["controller"])

    esp = Part.makeBox(52, 28, 2.0, vec(32, 26, 8.2))
    add_box(doc, "ESP32 DevKit V1 board - local decision computer", esp, PALETTE["controller"])
    add_box(doc, "ESP32 metal RF shield", Part.makeBox(16, 13, 1.2, vec(49, 33, 10.6)), (0.72, 0.75, 0.72))
    add_box(doc, "ESP32 USB connector", Part.makeBox(7, 9, 3, vec(32, 35.5, 10.4)), (0.62, 0.64, 0.66))

    # Pin header rows.
    for y in (24, 56):
        add_box(doc, "ESP32 black pin header rail", Part.makeBox(54, 2.2, 3.0, vec(31, y, 10.4)), (0.02, 0.02, 0.02))
        for idx in range(12):
            add_box(doc, "ESP32 gold header pin", Part.makeBox(1.0, 1.0, 3.7, vec(34 + idx * 4, y + 0.55, 12.0)), (0.94, 0.70, 0.22))

    # Power supply and terminal blocks.
    add_box(doc, "5V to 3V3 buck converter - orange power category", Part.makeBox(25, 15, 4, vec(22, 58, 8.2)), PALETTE["power"])
    add_box(doc, "Power entry fuse holder - safety power category", Part.makeBox(13, 7, 5, vec(22, 66, 8.2)), PALETTE["power"])
    add_box(doc, "Power switch rocker", Part.makeBox(10, 5, 4, vec(38, 66.5, 8.6)), (0.02, 0.02, 0.02))
    add_box(doc, "Power entry TVS ESD diode marker", Part.makeBox(5, 3, 3, vec(51, 67, 8.8)), (0.20, 0.20, 0.22))
    add_box(doc, "5V power rail red", Part.makeBox(70, 2.4, 2.4, vec(26, 18, 9.8)), (0.82, 0.08, 0.08))
    add_box(doc, "GND power rail black", Part.makeBox(70, 2.4, 2.4, vec(26, 21.5, 9.8)), (0.02, 0.02, 0.02))
    add_box(doc, "3V3 protected rail orange", Part.makeBox(70, 2.4, 2.4, vec(26, 25, 9.8)), (0.96, 0.44, 0.06))

    terminals = [
        ("PH/TURB terminal block", 91, 20),
        ("FLOW/TEMP terminal block", 91, 34),
        ("GAS/ENERGY terminal block", 91, 48),
        ("OLED/I2C terminal block", 91, 62),
    ]
    for name, x, y in terminals:
        add_box(doc, name, Part.makeBox(18, 9, 6, vec(x, y, 8.2)), (0.04, 0.36, 0.18))
        for pin in range(3):
            add_box(doc, f"{name} screw clamp", Part.makeCylinder(1.3, 0.7, vec(x + 4 + pin * 5, y + 4.5, 14.2)), (0.75, 0.77, 0.73))

    # Protection/calibration daughter board for 5V analog modules before ESP32 ADC.
    protection = Part.makeBox(36, 17, 2, vec(58, 58, 8.5))
    add_box(doc, "ADC protection and voltage divider board", protection, (0.12, 0.10, 0.24))
    for idx, x in enumerate((63, 71, 79, 87)):
        add_box(doc, f"ADC divider resistor pair {idx + 1}", Part.makeBox(2, 7, 2.2, vec(x, 62, 10.6)), (0.62, 0.46, 0.28))
    add_box(doc, "ADC protection capacitor bank", Part.makeBox(10, 4, 4, vec(62, 68, 10.6)), (0.12, 0.12, 0.14))
    add_box(doc, "ADC ESD clamp package", Part.makeBox(7, 4, 2.6, vec(79, 68, 10.6)), (0.04, 0.04, 0.05))

    # RF keep-out marker near ESP32 antenna.
    add_box(doc, "ESP32 antenna keep-out volume", Part.makeBox(18, 32, 0.8, vec(25, 24, 16)), (0.95, 0.76, 0.12), 68)

    # UI components behind front panel.
    add_box(doc, "OLED module PCB behind bezel", Part.makeBox(48, 18, 1.5, vec(18, 2.6, 18)), (0.02, 0.18, 0.16))
    add_box(doc, "Active buzzer module", Part.makeCylinder(6.5, 5, vec(74, 7, 13), vec(0, 1, 0)), (0.02, 0.02, 0.02))
    add_box(doc, "Calibration push button cap", Part.makeCylinder(4.0, 3, vec(110, 7, 13), vec(0, 1, 0)), (0.07, 0.08, 0.08))

    # Resistors and pull-up.
    for idx, x in enumerate((75, 88, 101)):
        add_box(doc, f"220 ohm LED resistor {idx + 1}", Part.makeCylinder(1.2, 10, vec(x, 13, 14), vec(1, 0, 0)), (0.76, 0.58, 0.36))
    add_box(doc, "4.7k DS18B20 pull-up resistor", Part.makeCylinder(1.2, 12, vec(54, 59, 14), vec(1, 0, 0)), (0.36, 0.55, 0.82))

    # Decoupling capacitor blocks close to power entry and ESP32 rail.
    for x, y in ((58, 21), (61, 21), (64, 21), (26, 62)):
        add_box(doc, "0.1uF local decoupling capacitor", Part.makeCylinder(1.1, 3.5, vec(x, y, 11), vec(0, 0, 1)), (0.10, 0.10, 0.12))
    add_box(doc, "10uF bulk power capacitor", Part.makeCylinder(2.4, 5.5, vec(32, 62, 10.5), vec(0, 0, 1)), (0.05, 0.05, 0.06))


def make_wiring_harness(doc: App.Document):
    # Power distribution.
    make_wire(doc, "5V red power wire to ESP32 VIN", (31, 18, 12), (37, 31, 13), (0.85, 0.02, 0.02), 1.1)
    make_wire(doc, "GND black wire to ESP32", (31, 21.5, 12), (37, 52, 13), (0.0, 0.0, 0.0), 1.1)
    make_wire(doc, "3V3 orange rail from buck converter", (46, 62, 12), (84, 62, 13), (0.95, 0.42, 0.08), 0.9)

    # Signal harnesses to terminal blocks.
    harnesses = [
        ("pH AO blue wire GPIO34", (84, 28, 13), (91, 24, 14), (0.1, 0.25, 0.85)),
        ("Turbidity AO violet wire GPIO35", (84, 31, 13), (91, 27, 14), (0.45, 0.18, 0.78)),
        ("Flow pulse green wire GPIO27", (84, 36, 13), (91, 38, 14), (0.0, 0.62, 0.18)),
        ("DS18B20 yellow OneWire GPIO4", (84, 40, 13), (91, 41, 14), (0.95, 0.76, 0.05)),
        ("MQ-135 gray wire GPIO32", (84, 46, 13), (91, 52, 14), (0.46, 0.48, 0.50)),
        ("Energy sensor brown wire GPIO33", (84, 50, 13), (91, 55, 14), (0.45, 0.24, 0.08)),
        ("OLED SDA cyan wire GPIO21", (42, 26, 13), (33, 8, 21), (0.0, 0.72, 0.82)),
        ("OLED SCL white wire GPIO22", (46, 26, 13), (41, 8, 21), (0.92, 0.92, 0.88)),
        ("Buzzer signal wire GPIO19", (76, 26, 13), (74, 8, 17), (0.9, 0.22, 0.22)),
        ("Button signal wire GPIO25", (80, 26, 13), (110, 8, 17), (0.2, 0.2, 0.2)),
    ]
    for name, start, end, color in harnesses:
        make_wire(doc, name, start, end, color, 0.75)

    # Sensor exit harnesses between internal terminal blocks and external modules.
    external_runs = [
        ("pH shielded cable through PH gland", (109, 24, 14), (132, 12, 30), (0.1, 0.25, 0.85)),
        ("Turbidity cable through TURB gland", (109, 27, 14), (132, 24, 30), (0.45, 0.18, 0.78)),
        ("Flow cable through FLOW gland", (109, 38, 14), (132, 36, 30), (0.0, 0.62, 0.18)),
        ("Temperature cable through TEMP gland", (109, 41, 14), (132, 48, 30), (0.95, 0.76, 0.05)),
        ("Gas sensor cable through GAS gland", (109, 52, 14), (132, 60, 30), (0.46, 0.48, 0.50)),
        ("Energy sensor cable through ENERGY gland", (109, 55, 14), (132, 72, 30), (0.45, 0.24, 0.08)),
    ]
    for name, start, end, color in external_runs:
        make_wire(doc, name, start, end, color, 0.85)


def make_service_views(doc: App.Document):
    # Non-functional layout aids for presentation and hand assembly.
    add_box(doc, "Exploded lid offset reference rail", Part.makeBox(120, 1.0, 1.0, vec(0, 88, 8)), (0.40, 0.45, 0.43), 45)
    add_box(doc, "Lid-off service zone label plate", Part.makeBox(36, 0.7, 6, vec(8, 83, 16)), (0.86, 0.90, 0.84))
    add_box(doc, "Wet zone service label plate", Part.makeBox(30, 0.7, 6, vec(124, 83, 16)), (0.86, 0.90, 0.84))


def make_logic_callouts(doc: App.Document):
    callouts = [
        ("EDGE AI RULES", 20, 72, 20, PALETTE["controller"]),
        ("SENSOR QA", 49, 72, 20, PALETTE["sensor"]),
        ("SHA256 HASH", 75, 72, 20, PALETTE["data"]),
        ("WIFI UPLOAD", 101, 72, 20, PALETTE["data"]),
    ]
    for label, x, y, z, color in callouts:
        add_box(doc, f"{label} logic badge", Part.makeBox(20, 7, 1.2, vec(x, y, z)), color)
        add_box(doc, f"{label} label face", Part.makeBox(18, 0.6, 4, vec(x + 1, y - 0.5, z + 1.4)), (0.82, 0.88, 0.84))

    make_wire(doc, "logic path sensors to edge AI - data category", (29, 72, 22), (49, 72, 22), PALETTE["data"], 0.65)
    make_wire(doc, "logic path QA to hash - data category", (58, 72, 22), (75, 72, 22), PALETTE["data"], 0.65)
    make_wire(doc, "logic path hash to wifi - data category", (84, 72, 22), (101, 72, 22), PALETTE["data"], 0.65)


def make_annotation_blocks(doc: App.Document):
    add_box(doc, "Front label: SENSOR IN to VERIFIED DATA OUT", Part.makeBox(58, 0.8, 5, vec(31, -3.7, 34)), (0.82, 0.86, 0.80))
    add_box(doc, "Payload hash badge area", Part.makeBox(34, 0.8, 9, vec(78, -3.7, 10)), (0.82, 0.86, 0.80))

    legend_items = [
        ("LEGEND FLUID", PALETTE["fluid"]),
        ("LEGEND SENSOR", PALETTE["sensor"]),
        ("LEGEND POWER", PALETTE["power"]),
        ("LEGEND CONTROLLER", PALETTE["controller"]),
        ("LEGEND PROOF DATA", PALETTE["data"]),
    ]
    for idx, (label, color) in enumerate(legend_items):
        y = 92 + idx * 8
        add_box(doc, f"{label} color swatch", Part.makeBox(12, 5, 1.0, vec(-44, y, 15)), color)
        add_box(doc, f"{label} readable category label", Part.makeBox(34, 0.7, 4.5, vec(-30, y, 15)), (0.86, 0.90, 0.84))


def export_outputs(doc: App.Document):
    OUT_DIR.mkdir(exist_ok=True)
    doc.recompute()
    fcstd_path = OUT_DIR / "eco_cipher_edge_verifier_detailed.FCStd"
    step_path = OUT_DIR / "eco_cipher_edge_verifier_detailed.step"
    stl_path = OUT_DIR / "eco_cipher_edge_verifier_detailed.stl"

    doc.saveAs(str(fcstd_path))

    objects = [obj for obj in doc.Objects if hasattr(obj, "Shape")]
    try:
        import Import

        Import.export(objects, str(step_path))
    except Exception as exc:
        App.Console.PrintWarning(f"STEP export skipped: {exc}\n")

    if Mesh is not None:
        try:
            Mesh.export(objects, str(stl_path))
        except Exception as exc:
            App.Console.PrintWarning(f"STL export skipped: {exc}\n")

    App.Console.PrintMessage(f"Generated FreeCAD prototype in {OUT_DIR}\n")


def build():
    doc = App.newDocument("EcoCipherEdgeVerifierDetailed")
    make_body(doc)
    make_lid(doc)
    make_electronics_stack(doc)
    make_wiring_harness(doc)
    make_front_components(doc)
    make_ports_and_labels(doc)
    make_mounting_tabs(doc)
    make_demo_plumbing(doc)
    make_sensor_modules(doc)
    make_logic_callouts(doc)
    make_annotation_blocks(doc)
    make_service_views(doc)
    export_outputs(doc)
    return doc


if __name__ == "__main__":
    build()
