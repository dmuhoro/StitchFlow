# Design Direction: Pan-African Haute Couture & Bespoke Atelier (StitchFlow)

## Executive Summary
StitchFlow is rooted in the rich sartorial traditions of Africa. It honors bespoke tailoring that has existed across the continent for generations—from the grand embroidered Agbadas of Yorubaland and Senegalese Boubous to the precision-cut Kenyan Kikoy coats, Swahili Kanzus, Ghanaian Kente ceremonial robes, and contemporary Afro-futurist couture gowns.

The visual language rejects Eurocentric styling in favor of authentic African aesthetics: warm terracotta and savannah ochre palettes, intricate geometric embroidery motifs, organic linen and woven textures, proud typographic scales, and high-utility mobile workflows for African artisans in markets from Nairobi and Lagos to Accra and Johannesburg.

---

## 1. Design Tokens (W3C Standard Format)

```json
{
  "color": {
    "brand": {
      "ebony": { "$value": "#161311", "$type": "color", "$description": "Deep carved African ebony wood" },
      "savannah-gold": { "$value": "#D4A347", "$type": "color", "$description": "Warm Ghanaian gold dust / brass embroidery threads" },
      "terracotta": { "$value": "#C25E34", "$type": "color", "$description": "Rich red earth & clay dye of the Rift Valley" },
      "indigo-royal": { "$value": "#1A2639", "$type": "color", "$description": "Traditional Yoruba Adire indigo dye" },
      "forest-malachite": { "$value": "#1E3A2F", "$type": "color", "$description": "Congo forest green silk accent" }
    },
    "surface": {
      "canvas": { "$value": "#FAF6F0", "$type": "color", "$description": "Raw unbleached organic cotton / raffia cloth" },
      "card": { "$value": "#FFFFFF", "$type": "color" },
      "subtle": { "$value": "#F3ECE1", "$type": "color" },
      "border": { "$value": "#E5DACB", "$type": "color" },
      "border-strong": { "$value": "#C8B69F", "$type": "color" }
    },
    "text": {
      "primary": { "$value": "#1A1715", "$type": "color", "$description": "WCAG AAA 14.9:1 against canvas" },
      "secondary": { "$value": "#6A5D52", "$type": "color", "$description": "WCAG AA 5.4:1 against canvas" },
      "muted": { "$value": "#98897C", "$type": "color" }
    },
    "garment-status": {
      "cutting": {
        "bg": { "$value": "#FEF3C7", "$type": "color", "$description": "Fabric layout & wax print grain matching" },
        "fg": { "$value": "#92400E", "$type": "color" }
      },
      "embroidery": {
        "bg": { "$value": "#FEE2E2", "$type": "color", "$description": "Hand embroidery & chain-stitching" },
        "fg": { "$value": "#991B1B", "$type": "color" }
      },
      "stitching": {
        "bg": { "$value": "#E0E7FF", "$type": "color", "$description": "Artisan seam assembly" },
        "fg": { "$value": "#3730A3", "$type": "color" }
      },
      "fitting": {
        "bg": { "$value": "#EDE9FE", "$type": "color", "$description": "Ceremonial basted try-on" },
        "fg": { "$value": "#5B21B6", "$type": "color" }
      },
      "ready": {
        "bg": { "$value": "#D1FAE5", "$type": "color", "$description": "Pressed, Fila/Gele boxed, ready for celebration" },
        "fg": { "$value": "#065F46", "$type": "color" }
      }
    }
  },
  "typography": {
    "font-family": {
      "display": { "$value": "'Cormorant Garamond', Georgia, serif", "$type": "fontFamily" },
      "sans": { "$value": "'Plus Jakarta Sans', system-ui, sans-serif", "$type": "fontFamily" },
      "mono": { "$value": "'Space Grotesk', monospace", "$type": "fontFamily" }
    },
    "scale": {
      "xs": { "$value": "11px", "$type": "dimension" },
      "sm": { "$value": "13px", "$type": "dimension" },
      "base": { "$value": "15px", "$type": "dimension" },
      "lg": { "$value": "18px", "$type": "dimension" },
      "xl": { "$value": "22px", "$type": "dimension" },
      "2xl": { "$value": "28px", "$type": "dimension" },
      "3xl": { "$value": "36px", "$type": "dimension" },
      "4xl": { "$value": "48px", "$type": "dimension" }
    }
  },
  "spacing": {
    "xs": { "$value": "8px", "$type": "dimension" },
    "sm": { "$value": "12px", "$type": "dimension" },
    "md": { "$value": "16px", "$type": "dimension" },
    "lg": { "$value": "24px", "$type": "dimension" },
    "xl": { "$value": "32px", "$type": "dimension" }
  },
  "radius": {
    "sm": { "$value": "6px", "$type": "dimension" },
    "md": { "$value": "12px", "$type": "dimension" },
    "lg": { "$value": "20px", "$type": "dimension" },
    "full": { "$value": "9999px", "$type": "dimension" }
  }
}
```

---

## 2. CSS Custom Properties Root Mapping

```css
:root {
  --sf-color-ebony: #161311;
  --sf-color-primary: #161311;
  --sf-color-primary-fg: #FAF6F0;
  --sf-color-gold: #D4A347;
  --sf-color-terracotta: #C25E34;
  --sf-color-indigo: #1A2639;
  --sf-color-canvas: #FAF6F0;
  --sf-color-card: #FFFFFF;
  --sf-color-subtle: #F3ECE1;
  --sf-color-border: #E5DACB;
  --sf-color-border-strong: #C8B69F;
  --sf-color-text-primary: #1A1715;
  --sf-color-text-secondary: #6A5D52;
  --sf-color-text-muted: #98897C;
}
```

---

## 3. Cultural Sartorial Breakdowns
- **Agbada & Grand Boubou:** Requires specialized measurements (Full Wingspan across shoulders, Robe Drop Length, Buba Chest, Sokoto Inseam, Fila Cap Circumference).
- **Senator Suit & Kaftan:** Clean tailored collar, concealed front button placket, geometric chest chain-stitching.
- **Kitenge & Ankara Tailoring:** Wax print grain alignment across seams and waist darts.
- **Ceremonial & Bridal (Ruracio, Traditional Wedding, Aso-Ebi):** Cowrie shell embellishments, hand-beaded lace, Gele headwrap coordinations.
