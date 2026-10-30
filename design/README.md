# StitchFlow: Pan-African Couture & Bespoke Fashion Design System

## Overview
StitchFlow is a dedicated design system and vertical SaaS architecture celebrating authentic African fashion, bespoke tailoring, and artisanal workshops across the continent (Nairobi, Lagos, Accra, Johannesburg, Dakar, and Addis Ababa).

It honors African garments—including **Grand Agbadas, Modern Senator Suits, Bespoke Kaftans, Kitenge/Ankara Corsetry, Swahili Kanzus, Kenyan Kikoy Outerwear, and Traditional Wedding Regalia (Ruracio & Aso-Ebi)**—without European or American sartorial compromises.

---

## Deliverables Architecture
All deliverables are independently structured to enable separate review and commits:

1. **Design Direction (`design/directions/01-luxury-atelier-design-direction.md`):**
   - W3C Design Tokens JSON schema with Savannah Gold, Terracotta Ochre, Royal Indigo, and Carved Ebony.
   - WCAG 2.1 AA accessibility ratios (14.9:1 high-contrast readability).
2. **Component Briefs (`design/briefs/`):**
   - `01-measurement-card-component.md`: African garment measurements (Agbada wingspan, Kaftan chest, Sokoto inseam, Fila cap circumference).
   - `02-production-stepper-component.md`: 4-phase African couture pipeline (Cutting & Print Alignment -> Stitching -> Basted Fitting -> Ready).
   - `03-lookbook-and-booking-briefs.md`: Lookbook showcase and cultural ceremony appointment booking.
3. **Core TypeScript Data & Schemas (`src/types.ts`, `src/data/initialData.ts`):**
   - Schemas for African garments, cultural ceremony appointments, and specialized measurements.
4. **Interactive Atelier Application (`src/components/`, `src/App.tsx`):**
   - Responsive across 320px mobile tailor smartphones, 768px iPads, and 1280px atelier desktops.
