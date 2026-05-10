// Eco-Cipher Edge Verifier parametric enclosure.
// Render body() and lid() separately for print preparation if needed.

$fn = 48;

length_mm = 120;
width_mm = 80;
height_mm = 40;
wall_mm = 3;
lid_thickness_mm = 3;
corner_radius_mm = 5;
screw_diameter_mm = 3.2;
post_diameter_mm = 8;
post_hole_mm = 2.7;

module rounded_box(size, radius) {
  hull() {
    for (x = [radius, size[0] - radius]) {
      for (y = [radius, size[1] - radius]) {
        translate([x, y, 0]) cylinder(h = size[2], r = radius);
      }
    }
  }
}

module screw_holes(z_height) {
  for (x = [12, length_mm - 12]) {
    for (y = [12, width_mm - 12]) {
      translate([x, y, -1]) cylinder(h = z_height + 2, d = screw_diameter_mm);
    }
  }
}

module mounting_posts() {
  for (x = [36, 84]) {
    for (y = [24, 56]) {
      translate([x, y, wall_mm]) {
        difference() {
          cylinder(h = 10, d = post_diameter_mm);
          translate([0, 0, -1]) cylinder(h = 12, d = post_hole_mm);
        }
      }
    }
  }
}

module front_panel_cutouts() {
  translate([24, -1, 21]) cube([44, wall_mm + 2, 16]);
  for (x = [78, 90, 102]) {
    translate([x, -1, 27]) rotate([90, 0, 0]) cylinder(h = wall_mm + 2, d = 5);
  }
}

module side_ports() {
  port_labels = ["PWR", "PH", "TURB", "FLOW", "TEMP", "GAS", "ENERGY"];
  for (i = [0:6]) {
    translate([length_mm + 1, 10 + i * 9.5, 21]) rotate([0, 90, 0]) cylinder(h = wall_mm + 2, d = 6);
    translate([length_mm + 0.8, 6 + i * 9.5, 30]) rotate([90, 0, 90])
      linear_extrude(height = 0.6) text(port_labels[i], size = 3, halign = "center");
  }
}

module category_legend() {
  labels = ["FLUID", "SENSOR", "POWER", "CTRL", "DATA"];
  colors = ["#22A8B8", "#D9A42F", "#D66A2F", "#2F8F69", "#1F6FD6"];
  for (i = [0:4]) {
    translate([-42, 18 + i * 8, 8]) {
      color(colors[i]) cube([10, 5, 1]);
      translate([13, 0, 0]) color("#DDE5D8")
        linear_extrude(height = 0.7) text(labels[i], size = 3, valign = "center");
    }
  }
}

module mounting_tabs() {
  for (x = [-17, length_mm + 7]) {
    translate([x, 22, 0]) {
      difference() {
        rounded_box([18, 36, 5], 4);
        translate([9, 18, -1]) cylinder(h = 7, d = 5);
      }
    }
  }
}

module body() {
  difference() {
    union() {
      difference() {
        rounded_box([length_mm, width_mm, height_mm], corner_radius_mm);
        translate([wall_mm, wall_mm, wall_mm])
          rounded_box([length_mm - wall_mm * 2, width_mm - wall_mm * 2, height_mm], corner_radius_mm - 1);
      }
      mounting_posts();
      mounting_tabs();
    }
    screw_holes(height_mm);
    front_panel_cutouts();
    side_ports();
  }

  translate([14, 2.8, 34]) rotate([90, 0, 0])
    linear_extrude(height = 0.8) text("SENSOR IN -> VERIFIED DATA OUT", size = 4);
}

module lid() {
  translate([0, 92, 0]) {
    difference() {
      rounded_box([length_mm, width_mm, lid_thickness_mm], corner_radius_mm);
      screw_holes(lid_thickness_mm);
    }
    translate([length_mm / 2, width_mm / 2 + 16, lid_thickness_mm])
      linear_extrude(height = 0.8)
        text("ECO-CIPHER EDGE VERIFIER", size = 6, halign = "center", valign = "center");
    translate([length_mm - 32, width_mm / 2 - 18, lid_thickness_mm])
      linear_extrude(height = 0.8)
        text("ID: EC-EDGE-001", size = 4, halign = "center", valign = "center");
  }
}

color("#59645E") body();
color("#59645E") lid();
category_legend();
