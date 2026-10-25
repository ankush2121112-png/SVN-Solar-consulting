# ☀ SVN Solar Consulting — Web App & AMC Marketplace

> **Solar Vision & New Energy (SVN Solar)**
> भारत का भरोसेमंद सोलर कंसल्टिंग, सर्टिफाइड वेंडर मार्केटप्लेस एवं वार्षिक मेंटेनेंस (AMC) सर्विस पोर्टल।

---

## 🌟 मुख्य विशेषताएँ (Key Features)

### 1. 🏠 पब्लिक वेबसाइट एवं सोलर कैलकुलेटर
- **सोलर बचत कैलकुलेटर:** मासिक बिजली बिल के आधार पर अनुशंसित kW क्षमता, छायामुक्त छत की जगह, वार्षिक बचत एवं पे-बैक अवधि।
- **PM सूर्य घर मुफ्त बिजली योजना गाइडेंस:** ₹78,000 तक की सरकारी सब्सिडी का संपूर्ण मार्गदर्शन।
- **विविध समाधान:** Residential Rooftop, Commercial On-Grid, Solar Agricultural Pump (KUSUM) और Annual Maintenance (AMC)।

### 2. 🤖 AI Solar Requirement Assistant
- स्मार्ट इंटरएक्टिव चैट-आधारित सवाल-जवाब।
- छत की स्थिति, मासिक बिल, शहर (सतना, रीवा, मैहर आदि) व बजट के आधार पर तुरंत तकनीकी रिपोर्ट व लीड जनरेशन।

### 3. 👤 Customer Portal (ग्राहक पोर्टल)
- **सोलर प्रोजेक्ट ट्रैकिंग:** अपनी लीड्स का लाइव स्टेटस (New → Site Visit → Quotation Received → Installation → Completed)।
- **कोटेशन तुलना (Quotation Comparison):** अलग-अलग वेंडर्स द्वारा सबमिट किए गए रेट्स, पैनल ब्रांड, इन्वर्टर मॉडल और वारंटी की पारदर्शी तुलना एवं 1-क्लिक स्वीकृति।
- **डिजिटल सोलर फाइल (Digital Solar File):** सिस्टम ID, क्षमता (kW), सीरियल नंबर और 25 वर्षीय वारंटी कार्ड का सुरक्षित रिकॉर्ड।
- **AMC प्लान्स एवं सर्विस बुकिंग:** Bronze, Silver, Gold पैकेज चुनना और पैनल सफाई या ब्रेकडाउन विजिट बुक करना।

### 4. 🛠️ Vendor Portal (सोलर इंस्टॉलर एवं पार्टनर)
- वेंडर रजिस्ट्रेशन एवं एडमिन सर्टिफिकेशन स्टेटस।
- असाइन की गई ग्राहक लीड्स देखना और तकनीकी कोटेशन सबमिट करना।
- सर्विस एवं AMC वर्क ऑर्डर्स स्वीकारना, स्टेटस अपडेट करना और फील्ड नोट्स जोड़ना।

### 5. 📊 Admin Dashboard (ऑपरेशन्स एवं ऑवरसाइट)
- **बिजनेस एनालिटिक्स:** कुल लीड्स, एक्टिव सोलर सिस्टम्स, एक्टिव AMCs और अनुमानित रेवेन्यू।
- **लीड मैनेजमेंट एवं असाइनमेंट:** लीड्स को वेरिफाइड लोकल वेंडर्स को असाइन करना।
- **वेंडर वेरिफिकेशन:** वेंडर्स की प्रोफाइल और डाक्यूमेंट्स जांच कर 1-क्लिक वेरिफिकेशन।
- **डिजिटल सोलर फाइल क्रिएशन:** ग्राहकों के इंस्टॉल हुए सोलर प्लांट और वारंटी रिकॉर्ड्स दर्ज करना।
- **AMC एक्टिवेशन:** ग्राहक के AMC अनुरोध को एक्टिवेट करना, वैधता तारीखें और वेंडर पे-आउट तय करना।

---

## 🚀 इंस्टॉलेशन एवं रन करने के चरण (Quick Start)

### 1. कोड क्लोन या डाउनलोड करें
```bash
git clone https://github.com/ankush2121112-png/SVN-Solar-consulting.git
cd SVN-Solar-consulting
```

### 2. डिपेंडेंसीज इंस्टॉल करें
```bash
npm install
```

### 3. पर्यावरण चर (.env) कॉन्फ़िगर करें
`.env.example` को कॉपी करके `.env` बनाएँ:
```bash
cp .env.example .env
```

`.env` फाइल की मुख्य सेटिंग्स:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/svn_solar
SESSION_SECRET=svn-solar-consulting-secure-session-secret-key-2026-xyz

ADMIN_NAME=SVN Solar Admin
ADMIN_EMAIL=admin@svnsolar.local
ADMIN_PASSWORD=SVNAdmin#2026!
```

> **नोट (Resilient Storage Mode):** यदि आपके कंप्यूटर पर MongoDB इंस्टॉल या चालू नहीं है, तो भी चिंता की कोई बात नहीं है! एप्लिकेशन ऑटोमैटिक रूप से **लोकल फॉलबैक स्टोर (`data/db.json`)** पर 100% कार्य करेगी। जब भी MongoDB Atlas या लोकल MongoDB चालू होगा, यह सीधे कनेक्ट हो जाएगी।

### 4. सर्वर शुरू करें
```bash
npm start
```
या डेवलपमेंट मोड में:
```bash
npm run dev
```

### 5. ब्राउज़र में खोलें
- **मुख्य वेबसाइट एवं AI असिस्टेंट:** [http://localhost:3000](http://localhost:3000)
- **ग्राहक / वेंडर / एडमिन पोर्टल:** [http://localhost:3000/portal.html](http://localhost:3000/portal.html)

---

## 🔑 डिफ़ॉल्ट क्रेडेंशियल्स (Testing Accounts)

| रोल (Role) | ईमेल (Email) | पासवर्ड (Password) | विवरण |
|---|---|---|---|
| **Admin** | `admin@svnsolar.local` | `SVNAdmin#2026!` | पूर्ण नियंत्रण, लीड असाइनमेंट, AMC एक्टिवेशन |
| **Demo Vendor** | `rewa.solar@svnsolar.local` | `SolarVendor#123` | रीवा/सतना वेरिफाइड वेंडर (कोटेशन व सर्विस) |
| **Customer** | नया अकाउंट रजिस्टर करें | स्वयं का पासवर्ड | AI चैट या पोर्टल से सीधा रजिस्ट्रेशन |

---

## 🏗️ टेक स्टैक (Architecture)

- **Backend:** Node.js, Express.js
- **Database:** MongoDB & Mongoose (with automated JSON store fallback for zero-setup local runs)
- **Authentication:** Express Session with Bcrypt.js password hashing & MongoStore
- **Frontend:** Vanilla JavaScript, HTML5, Modern Responsive CSS3 (No heavy build steps needed, runs instantly!)
- **Security:** Helmet, Express Rate Limit, Role-Based Access Control (RBAC)
