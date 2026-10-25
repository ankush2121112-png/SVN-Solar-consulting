// SVN Solar Consulting - Main App & AI Solar Assistant Script

document.addEventListener("DOMContentLoaded", async () => {
  // Update auth button in nav
  const user = await checkAuth();
  const authNav = document.getElementById("nav-auth-btn");
  if (authNav) {
    if (user) {
      authNav.textContent = `Portal (${user.name.split(" ")[0]})`;
      authNav.href = "/portal.html";
    } else {
      authNav.textContent = "Login / Portal";
      authNav.href = "/portal.html";
    }
  }

  initSolarCalculator();
  initAIAssistant();
});

// Quick Solar Savings & Subsidy Calculator
function initSolarCalculator() {
  const billInput = document.getElementById("calcBill");
  if (!billInput) return;

  function recalculate() {
    const monthlyBill = Math.max(500, Number(billInput.value) || 3000);
    // Typical Indian residential tariff approx ₹7.5 / unit
    const monthlyUnits = monthlyBill / 7.5;
    // 1 kW solar generates ~120 units per month in Central India
    const recommendedKw = Math.max(1, Math.round((monthlyUnits / 120) * 10) / 10);
    // Roof space ~ 80-100 sq ft per kW
    const roofSpace = Math.round(recommendedKw * 90);

    // Approximate cost: ₹60,000 / kW
    const grossCost = recommendedKw * 60000;

    // PM Surya Ghar Muft Bijli Yojana Central Govt Subsidy:
    // 1 kW: ₹33,000 | 2 kW: ₹66,000 | 3 kW+: ₹78,000
    let subsidy = 0;
    if (recommendedKw <= 1.2) subsidy = 33000;
    else if (recommendedKw <= 2.2) subsidy = 66000;
    else subsidy = 78000;

    const netCost = Math.max(0, grossCost - subsidy);
    const annualSavings = monthlyBill * 12 * 0.9; // 90% bill offset
    const paybackYears = (netCost / annualSavings).toFixed(1);

    document.getElementById("resKw").textContent = `${recommendedKw} kW`;
    document.getElementById("resSpace").textContent = `${roofSpace} sq ft`;
    document.getElementById("resSavings").textContent = formatCurrency(Math.round(annualSavings)) + "/yr";
    document.getElementById("resSubsidy").textContent = formatCurrency(subsidy);
    document.getElementById("resPayback").textContent = `${paybackYears} Years`;
  }

  billInput.addEventListener("input", recalculate);
  recalculate();
}

// Interactive AI Solar Assistant
function initAIAssistant() {
  const chatBody = document.getElementById("aiChatBody");
  const optionsPanel = document.getElementById("aiOptionsPanel");
  const inputPanel = document.getElementById("aiInputPanel");
  const textInput = document.getElementById("aiTextInput");
  const sendBtn = document.getElementById("aiSendBtn");

  if (!chatBody) return;

  const assistantQuestions = [
    {
      key: "projectType",
      prompt: "नमस्ते! मैं SVN Solar Assistant हूँ ☀। आपको किस प्रकार के सोलर सिस्टम की आवश्यकता है?",
      options: [
        "Residential Rooftop (घरेलू छत)",
        "Commercial (दुकान / कार्यालय)",
        "Industrial (फैक्ट्री / शेड)",
        "Solar Agricultural Pump (सोलर कृषि पंप)",
        "Repair / AMC (मरम्मत या सर्विस)"
      ]
    },
    {
      key: "monthlyBill",
      prompt: "आपका वर्तमान औसत मासिक बिजली बिल कितना आता है?",
      options: [
        "₹1,000 तक (Up to ₹1,000)",
        "₹1,000 – ₹3,000",
        "₹3,000 – ₹6,000",
        "₹6,000 से अधिक (> ₹6,000)",
        "लागू नहीं / कृषि पंप (Agricultural Pump)"
      ]
    },
    {
      key: "spaceAvailable",
      prompt: "क्या आपके पास पर्याप्त धूप वाली पक्की छत या खाली जमीन उपलब्ध है?",
      options: [
        "हाँ, खुली पक्की छत उपलब्ध है (> 300 sq ft)",
        "छोटी छत उपलब्ध है (100–300 sq ft)",
        "खाली खुली जमीन / फार्म उपलब्ध है",
        "पुष्टि नहीं / साइट सर्वे आवश्यक"
      ]
    },
    {
      key: "budget",
      prompt: "सोलर लगवाने के लिए आपका अनुमानित बजट कितना है?",
      options: [
        "₹60,000 – ₹1.2 लाख (1–2 kW)",
        "₹1.2 – ₹2.5 लाख (3–5 kW)",
        "₹2.5 लाख से अधिक (Commercial / Large)",
        "सरकारी सब्सिडी एवं सोलर लोन पर निर्भर"
      ]
    },
    {
      key: "city",
      prompt: "इंस्टॉलेशन किस शहर या जिले में होना है? (जैसे सतना, रीवा, मैहर, पन्ना, भोपाल, आदि)",
      isFreeText: true,
      placeholder: "अपना शहर / जिला लिखें (e.g. Satna, Rewa)..."
    },
    {
      key: "contactInfo",
      prompt: "अंतिम कदम: कृपया अपना शुभ नाम और 10 अंकों का मोबाइल नंबर दर्ज करें ताकि SVN Solar की तकनीकी टीम आपको फ्री साइट रिपोर्ट भेज सके।",
      isFreeText: true,
      placeholder: "नाम और मोबाइल नंबर (e.g. Rahul Sharma, 9893012345)..."
    }
  ];

  let currentStep = 0;
  const leadAnswers = {};

  function addBubble(text, sender = "bot") {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble bubble-${sender}`;
    bubble.innerHTML = text.replace(/\n/g, "<br>");
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function renderStep() {
    optionsPanel.innerHTML = "";
    if (currentStep >= assistantQuestions.length) {
      completeAssessment();
      return;
    }

    const q = assistantQuestions[currentStep];
    addBubble(q.prompt, "bot");

    if (q.options) {
      inputPanel.style.display = "none";
      optionsPanel.style.display = "flex";
      q.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "option-chip";
        btn.textContent = opt;
        btn.onclick = () => handleAnswer(opt);
        optionsPanel.appendChild(btn);
      });
    } else {
      optionsPanel.style.display = "none";
      inputPanel.style.display = "flex";
      textInput.placeholder = q.placeholder || "अपना उत्तर लिखें...";
      textInput.value = "";
      textInput.focus();
    }
  }

  function handleAnswer(answer) {
    if (!answer || !answer.trim()) return;
    const cleanAns = answer.trim();
    addBubble(cleanAns, "user");

    const q = assistantQuestions[currentStep];
    leadAnswers[q.key] = cleanAns;

    currentStep++;
    setTimeout(renderStep, 400);
  }

  async function completeAssessment() {
    optionsPanel.style.display = "none";
    inputPanel.style.display = "none";

    // Parse contact
    let customerName = "Solar Customer";
    let customerPhone = "9876543210";
    if (leadAnswers.contactInfo) {
      const parts = leadAnswers.contactInfo.split(/[,;\-\/]/);
      customerName = parts[0].trim();
      const phoneMatch = leadAnswers.contactInfo.match(/\d{10}/);
      if (phoneMatch) customerPhone = phoneMatch[0];
    }

    // Estimate capacity recommendation
    let recommendedKw = "3 kW";
    if (leadAnswers.monthlyBill && leadAnswers.monthlyBill.includes("1,000 तक")) recommendedKw = "1 - 2 kW";
    else if (leadAnswers.monthlyBill && leadAnswers.monthlyBill.includes("6,000 से अधिक")) recommendedKw = "5 - 10 kW";

    addBubble("धन्यवाद! आपकी आवश्यकता रिपोर्ट तैयार की जा रही है और SVN Solar में लीड रजिस्टर हो रही है...", "bot");

    try {
      const payload = {
        customerName,
        customerPhone,
        city: leadAnswers.city || "Satna",
        projectType: leadAnswers.projectType ? leadAnswers.projectType.split(" (")[0] : "Residential Rooftop",
        monthlyBill: leadAnswers.monthlyBill || "",
        budget: leadAnswers.budget || "",
        spaceAvailable: leadAnswers.spaceAvailable || "",
        recommendedKw,
        requirement: `AI Assessment: Looking for ${leadAnswers.projectType}. Bill: ${leadAnswers.monthlyBill}. Budget: ${leadAnswers.budget}. Space: ${leadAnswers.spaceAvailable}.`
      };

      const res = await api("/api/leads", "POST", payload);

      addBubble(
        `✅ <b>सफल पंजीकरण! लीड ID: ${res.lead.leadNumber}</b><br><br>` +
        `<b>अनुशंसित क्षमता:</b> ${recommendedKw}<br>` +
        `<b>लोकेशन:</b> ${payload.city}<br>` +
        `<b>स्थिति:</b> ${res.lead.status} (Verified)<br><br>` +
        `SVN Solar की तकनीकी टीम आपसे 24 घंटे के अंदर संपर्क करेगी और प्रमाणित वेंडर्स से कोटेशन उपलब्ध कराएगी। आप पोर्टल पर लॉगिन करके कोटेशन तुलना और सोलर सिस्टम फाइल देख सकते हैं।`,
        "bot"
      );

      // Add reset button
      const resetBtn = document.createElement("button");
      resetBtn.className = "btn btn-outline btn-sm";
      resetBtn.style.margin = "10px 0";
      resetBtn.textContent = "🔄 नई पूछताछ शुरू करें (New Enquiry)";
      resetBtn.onclick = () => {
        chatBody.innerHTML = "";
        currentStep = 0;
        renderStep();
      };
      optionsPanel.appendChild(resetBtn);
      optionsPanel.style.display = "block";
    } catch (err) {
      addBubble(`त्रुटि: ${err.message}`, "bot");
    }
  }

  sendBtn.onclick = () => handleAnswer(textInput.value);
  textInput.onkeydown = e => {
    if (e.key === "Enter") handleAnswer(textInput.value);
  };

  renderStep();
}

// Open AMC booking modal with plan pre-selected
function openAmcModal(planName, price) {
  const modal = document.getElementById("amcModal");
  if (!modal) {
    window.location.href = `/portal.html?tab=amc&plan=${encodeURIComponent(planName)}`;
    return;
  }
  document.getElementById("modalPlanName").value = planName;
  document.getElementById("modalPlanPrice").value = price;
  modal.classList.add("active");
}

function closeAmcModal() {
  const modal = document.getElementById("amcModal");
  if (modal) modal.classList.remove("active");
}
