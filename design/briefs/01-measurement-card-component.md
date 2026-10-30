# Component Brief: `<stitchflow-african-measurement-card>`

## 1. Overview
The African Sartorial Measurement Card captures specialized anatomical and ceremonial dimensions required for authentic African attire (Agbada 3-Piece Sets, Senator Suits, Kitenge/Ankara Corseted Gowns, Swahili Kanzu, and Aso-Oke Ceremonial Wear).

Unlike standard Western suiting, African bespoke tailoring requires dimensions such as:
- **Agbada Wingspan (Wrist-to-Wrist span):** For majestic robe drape without dragging.
- **Agbada Robe Length:** Ankle-grazing ceremonial drop.
- **Kaftan / Buba Chest & Waist:** Calculated with regal ease allowances.
- **Sokoto / Trouser Inseam & Ankle Hem:** For clean taper over traditional leather slippers.
- **Fila Cap / Head Circumference:** For matching hand-embroidered caps.
- **Neckline / Placket Drop:** For embroidered collars and filigree plackets.
- **Gele & Wrapper Drape Length:** For ceremonial bridal and gala wraps.

## 2. Shadow DOM Specification
- **Tag:** `<stitchflow-african-measurement-card>`
- **Encapsulation:** `mode: 'open'`
- **Inherited CSS Custom Properties:**
  - `--sf-color-ebony`
  - `--sf-color-gold`
  - `--sf-color-terracotta`
  - `--sf-color-canvas`
  - `--sf-color-border`
  - `--sf-font-mono`

## 3. Custom Events
- `african-measurement-updated`: Dispatched when artisan adjusts dimensions or Agbada ease parameters.
  - `event.detail = { clientId: 'usr_client_01', agbadaWingspan: 66.5, unit: 'in', eventDeadline: '2026-11-20' }`
