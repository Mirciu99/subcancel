# SubCancel - Aplicație Detectare și Anulare Abonamente

## Descriere
Aplicație web pentru detectarea automată a abonamentelor din extrase bancare și generarea cererilor de reziliere.

## Development Commands

- `npm run dev` - Start development server with Turbopack (http://localhost:3000)
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## Tech Stack
- **Frontend**: Next.js 15 cu TypeScript și Tailwind CSS ✅
- **Backend**: API routes în Next.js  
- **Database**: Supabase cu Row Level Security ✅
- **Auth**: Supabase Auth cu middleware protection ✅
- **File Processing**: PapaParse pentru CSV, React Dropzone pentru upload ✅

## Project Architecture

### Directory Structure
- `src/app/` - App Router pages
  - `page.tsx` - Landing page ✅
  - `login/page.tsx` - Authentication ✅
  - `signup/page.tsx` - Registration ✅
  - `dashboard/page.tsx` - Main dashboard ✅
- `src/components/` - Reusable components
  - `FileUploader.tsx` - CSV upload with drag & drop ✅
  - `SubscriptionCard.tsx` - Subscription display ✅
  - `CancellationModal.tsx` - Cancellation request generator ✅
- `src/lib/` - Business logic
  - `supabase/` - Database clients (browser/server) ✅
  - `subscriptionDetector.ts` - Algorithm pentru detectare abonamente ✅
  - `cancellationGenerator.ts` - Generator cereri reziliere ✅
- `database/schema.sql` - Database schema pentru Supabase ✅

### Key Features Implemented

#### 1. Authentication & Authorization ✅
- Supabase Auth cu Google OAuth
- Middleware protection pentru rute protejate
- Row Level Security în database

#### 2. File Processing ✅
- **CSV upload** cu validare și normalizare
- **PDF upload** cu text extraction și OCR fallback
- **Suport pentru formate românești** (separatori, dată, bancă)
- **Drag & drop interface** pentru CSV și PDF
- **Multi-format transaction parsing** din extracte bancare

#### 3. Subscription Detection ✅
- Algoritm detectare plăți recurente
- Match cu merchants români cunoscuți
- Confidence scoring și categorii
- Smart detection pentru servicii populare

#### 4. Cancellation Generator ✅
- Template-uri legale pentru cereri reziliere
- Instrucțiuni specifice pe merchant
- Download și copy-to-clipboard

#### 5. Advanced Analytics Dashboard ✅
- **Pie chart pentru categorii abonamente** ✅
- Statistici avansate cu gradient design
- Responsive analytics layout
- Distinct de pagina de management

### Database Schema
- `users` - Profile utilizatori ✅
- `subscriptions` - Abonamente detectate/confirmate ✅
- `transactions` - Tranzacții din extrase ✅
- `cancellation_requests` - Cereri de anulare ✅
- `savings_tracking` - Urmărire economii ✅

### PDF Analysis System ✅
- **PDF text extraction** using pdf2json library ✅
- **Romanian transaction parsing** with date/amount/beneficiary extraction ✅
- **Subscription detection algorithm** requiring minimum 3 transactions, ±5% amount tolerance ✅
- **Confidence scoring** 0-100% based on pattern consistency ✅
- **Frequency detection** (weekly/monthly/bimonthly/quarterly) ✅
- **API route** `/api/analyze-pdf` with 10MB file size limit ✅
- **Dashboard integration** with PDF analysis results display ✅
- **Error handling** for scanned PDFs and processing failures ✅
- **Romanian banking format support** (BCR, BRD, ING, Raiffeisen) ✅

### Romanian Merchants Supported
Netflix, Spotify, YouTube Premium, Orange, Vodafone, Digi, UPC, Telekom, HBO Max, Disney+, Prime Video, Apple iCloud, Google One, Microsoft 365, Adobe, World Class, Fitness First, 7Card, eMAG Genius

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Getting Started
1. Create Supabase project and get credentials
2. Run database schema from `database/schema.sql`
3. Update `.env.local` with Supabase credentials  
4. Run `npm install && npm run dev`

### Implementation Status
✅ Supabase setup și configurare
✅ Authentication pages și middleware
✅ CSV upload și parsing
✅ Algoritm detectare abonamente
✅ Dashboard cu subscription cards
✅ Generator cereri de reziliere
✅ Landing page și UI/UX complet

### Algoritm Detectare
1. Parse CSV pentru tranzacții cu normalizare headers români
2. Grupare pe merchant/beneficiar cu fuzzy matching
3. Identificare plăți recurente (aceeași sumă ±5%, interval regulat)
4. Match cu merchants cunoscuți din database
5. Calculare confidence score bazat pe consistență
6. Confirmare utilizator prin dashboard

### MVP Status: COMPLET ✅
Toate funcționalitățile MVP au fost implementate și sunt funcționale.