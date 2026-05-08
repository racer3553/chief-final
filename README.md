# CHIEF BY WALKER SPORTS
## AI Crew Chief — Sim & Real World Racers

---

## EXACT STARTUP STEPS

### Step 1 — Install Node.js
- Go to nodejs.org
- Download the LTS version (Windows Installer .msi)
- Run installer, click Next through everything
- Restart your computer after install

### Step 2 — Verify Node.js installed
Open Command Prompt (Windows+R → type cmd → Enter) and run:
```
node -v
npm -v
```
Both should show version numbers.

### Step 3 — Add your .env.local file
Create a file called `.env.local` inside this folder with:
```
NEXT_PUBLIC_SUPABASE_URL=https://gaxmzhvslmlzgyfbcnih.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_legacy_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_legacy_service_role_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_webhook_secret_here
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_ELITE=price_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4 — Open Command Prompt IN this folder
1. Open this folder in File Explorer
2. Click the address bar at the top
3. Type `cmd` and press Enter
4. A Command Prompt opens already in the right folder

### Step 5 — Install packages
```
npm install
```
Wait 2-3 minutes. You will see a lot of text. That is normal.

### Step 6 — Run the app
```
npm run dev
```

### Step 7 — Open in browser
Go to: http://localhost:3000

You should see the CHIEF homepage.

---

## FILE STRUCTURE
```
chief-final/
├── package.json          ← npm dependencies (THE IMPORTANT ONE)
├── next.config.js        ← Next.js config
├── tailwind.config.ts    ← Styling config
├── tsconfig.json         ← TypeScript config
├── middleware.ts         ← Auth protection
├── .env.local            ← YOUR KEYS (you create this)
├── .env.example          ← Template for keys
├── app/                  ← All pages
│   ├── layout.tsx
│   ├── page.tsx          ← Homepage
│   ├── login/
│   ├── signup/
│   ├── pricing/
│   ├── auth/callback/
│   ├── api/
│   │   ├── ai/chat/      ← Ask Chief AI
│   │   ├── ai/analyze-image/
│   │   └── stripe/       ← Payments
│   └── dashboard/        ← App (protected)
│       ├── race-chief/
│       ├── sim-chief/
│       ├── ai-chat/
│       ├── tracks/
│       ├── team/
│       └── billing/
├── components/           ← Reusable UI
│   ├── shared/
│   ├── race-chief/
│   └── sim-chief/
├── lib/                  ← Utilities
│   ├── supabase/
│   ├── anthropic.ts
│   └── stripe.ts
├── styles/globals.css
└── supabase/migrations/  ← Run this SQL in Supabase
```

---

## IF npm install FAILS
Make sure you are in the right folder. In Command Prompt type:
```
dir
```
You should see `package.json` listed. If you don't, you're in the wrong folder.
Navigate to the correct folder with cd commands:
```
cd Desktop\chief-final
```
Then try npm install again.
