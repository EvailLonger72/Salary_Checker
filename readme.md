# 🏭 ShiftPay Calculator Dashboard

## 📝 ပရောဂျက်အကြောင်း

**ShiftPay Calculator** သည် စက်ရုံ shift အလုပ်သမားများအတွက် အချိန်နှင့် လစာတွက်ချက်မှုကို လွယ်ကူစေရန် ဖန်တီးထားသော web application တစ်ခုဖြစ်သည်။ ဤ application သည် C341 (နေ့ပိုင်း shift) နှင့် C342 (ညပိုင်း shift) ပါဝင်သော shift schedule များအတွက် အထူးဒီဇိုင်းပြုလုပ်ထားပါသည်။

## ✨ အဓိက လုပ်ဆောင်နိုင်မှုများ

### 💰 လစာတွက်ချက်မှု
- **Real-time Calculation**: အချိန်တွင် လစာတွက်ချက်မှု
- **Overtime Support**: အပိုချိန်လုပ်ငန်း (7h 35m နောက်ပိုင်း)
- **Night Premium**: ည၁၀နာရီနောက်ပိုင်း အပိုလစာ
- **Break Time Management**: အနားချိန်များ အလိုအလျောက်နုတ်ယူခြင်း

### 📊 Dashboard & Reports
- **Live Statistics**: လစာနှင့် အချိန်ကြမ်းများ တိုက်ရိုက်ပြသ
- **Weekly Tracking**: အပတ်စဉ် performance ခြေရာခံမှု
- **Visual Charts**: အချက်အလက်များကို chart များဖြင့် ပြသ
- **Goal Progress**: လစာပန်းတိုင် တိုးတက်မှု ကြည့်ရှုခြင်း

### 📅 Shift Management
- **C341 Day Shift**: 06:30〜17:30 (9h 20m net working)
- **C342 Night Shift**: 16:45〜01:25 (7h net working)
- **Automatic Break Calculation**: break အချိန်များ အလိုအလျောက်တွက်ချက်
- **Flexible Timing**: Start/End time များ ကိုယ်တိုင်သတ်မှတ်နိုင်

### 💾 Data Management
- **CSV Export**: Excel/Google Sheets နှင့် compatible
- **JSON Backup**: Data များကို အပြည့်အစုံ backup/restore
- **Weekly Reports**: အပတ်စဉ် အစီရင်ခံစာများ
- **Data Import**: ယခင် data များကို ပြန်လည်တင်သွင်းခြင်း

## 🛠️ နည်းပညာများ

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js 3.9.1
- **Styling**: Custom CSS with Backdrop Filter Effects
- **Storage**: Browser LocalStorage
- **Architecture**: Single Page Application (SPA)

## 📂 File Structure

```
shift_pay_calculator/
├── shift_pay_calculator.html    # Main HTML file
├── style.css                    # Styling and responsive design
├── script.js                    # Main application logic
├── chart.js                     # Chart configurations
├── break_schedule.js            # Shift and break data
└── README.md                    # Documentation
```

## 🚀 Setup & Installation

### 1. Requirements
- Modern web browser (Chrome, Firefox, Edge, Safari)
- No server required - works offline

### 2. Installation Steps
```bash
# 1. Download project files
git clone [repository-url]

# 2. Open project folder
cd shift_pay_calculator

# 3. Open in browser
# Double-click shift_pay_calculator.html
# OR use Live Server in VS Code
```

### 3. VS Code Setup (Recommended)
```bash
# Install Live Server extension
# Right-click on HTML file → "Open with Live Server"
```

## 📖 အသုံးပြုနည်းလမ်းညွှန်

### 💰 လစာတွက်ချက်ခြင်း

1. **Calculator** tab သို့သွားပါ
2. **Shift Type** ရွေးချယ်ပါ (C341 သို့မဟုတ် C342)
3. **Start Time** နှင့် **End Time** ထည့်ပါ
4. **Work Date** ရွေးချယ်ပါ
5. **Calculate Pay** button ကိုနှိပ်ပါ
6. **Add to Weekly Report** ဖြင့် data သိမ်းဆည်းပါ

### 📊 Dashboard ကြည့်ရှုခြင်း

1. **Dashboard** tab သို့သွားပါ
2. Total earnings, hours, daily average ကြည့်ပါ
3. Weekly earnings trend chart ကို လေ့လာပါ
4. Recent shifts list ကို ပြန်လည်ကြည့်ရှုပါ

### 📅 Weekly Report

1. **Weekly Report** tab သို့သွားပါ
2. အပတ်စဉ် summary statistics ကြည့်ပါ
3. Individual entries တွေကို review လုပ်ပါ
4. Weekly performance chart ကို လေ့လာပါ

### ⚙️ Settings Configuration

1. **Settings** tab သို့သွားပါ
2. Pay rates update လုပ်ပါ:
   - Base Rate (default: ¥2,100)
   - Overtime Rate (default: ¥2,625)
3. Weekly goals သတ်မှတ်ပါ:
   - Target hours
   - Target pay amount

## 📊 Pay Calculation Logic

### Base Rates
- **Regular Hours**: ¥2,100/hour (first 7h 35m)
- **Overtime**: ¥2,625/hour (after 7h 35m)
- **Night Premium**: ¥2,625/hour (after 22:00)

### Shift Schedules

#### C341 Day Shift (06:30〜17:30)
- Total: 11 hours
- Breaks: 1h 40m total
- Net Working: 9h 20m
- Break Times:
  - 08:30〜08:40 (10m)
  - 10:40〜11:25 (45m)
  - 13:05〜13:15 (10m)
  - 14:35〜14:45 (10m)
  - 16:10〜16:20 (10m)
  - 17:20〜17:35 (15m)

#### C342 Night Shift (16:45〜01:25)
- Total: 8h 40m
- Breaks: 1h 40m total
- Net Working: 7h
- Night Premium: Applied after 22:00
- Break Times:
  - 18:45〜18:55 (10m)
  - 20:55〜21:40 (45m)
  - 23:10〜23:20 (10m)
  - 00:50〜01:00 (10m)
  - 02:25〜02:35 (10m)
  - 03:35〜03:50 (15m)

## 📈 Data Export/Import

### CSV Export
- **Detailed Data**: All shift entries with full breakdown
- **Summary Report**: Weekly statistics and totals
- **Excel Compatible**: Opens directly in Excel/Google Sheets

### JSON Backup
- **Complete Backup**: All data including settings
- **Restore Functionality**: Full data restoration
- **Cross-device**: Transfer data between devices

## 🎨 UI Features

### Modern Design
- **Glass Morphism**: Modern backdrop filter effects
- **Responsive Layout**: Works on desktop, tablet, mobile
- **Dark Gradient**: Professional blue gradient background
- **Smooth Animations**: Hover effects and transitions

### Interactive Charts
- **Line Charts**: Daily earnings trends
- **Pie Charts**: Working time breakdown
- **Bar Charts**: Pay distribution analysis
- **Multi-axis**: Hours vs Pay comparison

## 🔧 Troubleshooting

### Common Issues

#### Charts မပေါ်ခြင်း
```javascript
// Chart.js library စစ်ဆေးခြင်း
console.log(typeof Chart); // 'function' ဖြစ်ရမယ်
```

#### Data မသိမ်းဆည်းခြင်း
```javascript
// LocalStorage support စစ်ဆေးခြင်း
console.log(typeof Storage !== "undefined");
```

#### Navigation မလုပ်ဆောင်ခြင်း
```javascript
// DOM elements စစ်ဆေးခြင်း
console.log(document.querySelectorAll('.nav-item').length);
```

### Error Checking in VS Code
1. **Ctrl+Shift+M** - Problems panel ဖွင့်ခြင်း
2. **F8** - Next error သို့သွားခြင်း
3. Install **ESLint extension** for better error detection

## 🔒 Data Privacy

- **Local Storage Only**: Data များကို browser တွင်သာ သိမ်းဆည်း
- **No Server Communication**: Internet မလိုအပ်
- **User Control**: အသုံးပြုသူက data ကို အပြည့်အစုံ ထိန်းချုပ်

## 🤝 Contributing

### Development Setup
```bash
# Clone repository
git clone [repository-url]

# Open in VS Code
code shift_pay_calculator

# Install Live Server extension
# Start development server
```

### Code Style
- Use ES6+ features
- Follow camelCase naming
- Add comments for complex logic
- Maintain responsive design

## 📞 Support

Issues ရှိပါက:
1. Browser console ကို ကြည့်ပါ (F12)
2. Problems panel ကို VS Code မှာ စစ်ပါ
3. Files များ အစီအစဉ်တကျ load ဖြစ်မဖြစ် စစ်ပါ

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Chart.js** - Chart rendering library
- **Modern CSS** - Backdrop filter and animation techniques
- **Factory Workers** - Real-world shift schedule requirements

---

**Version**: 1.0.0  
**Last Updated**: 2025  
**Author**: ShiftPay Development Team

💡 **Tip**: Browser bookmark လုပ်ထားပြီး offline အသုံးပြုနိုင်ပါသည်!
