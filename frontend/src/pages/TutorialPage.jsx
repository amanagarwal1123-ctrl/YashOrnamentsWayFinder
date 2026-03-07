import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Navigation, Shield, Headphones, MapPin, QrCode, Phone, HelpCircle, Route, Image, Video, Compass, Users, Coins, BarChart3, Paintbrush, Camera, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const Section = ({ icon: Icon, title, children }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-5 h-5 text-[hsl(var(--brand))]" />}
      <h3 className="font-semibold text-base">{title}</h3>
    </div>
    <div className="space-y-2 text-sm leading-relaxed text-[hsl(var(--foreground))]">{children}</div>
  </motion.div>
);

const Step = ({ num, children }) => (
  <div className="flex gap-3 py-2">
    <span className="w-6 h-6 rounded-full bg-[hsl(var(--brand)/0.15)] text-[hsl(var(--brand))] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{num}</span>
    <div className="flex-1">{children}</div>
  </div>
);

export default function TutorialPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('customer');

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[hsl(var(--card))]/95 backdrop-blur-sm border-b border-[hsl(var(--border))]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-[hsl(var(--muted))]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display font-semibold text-lg">ऐप गाइड / App Tutorial</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Yash Ornaments WayFinder — सम्पूर्ण मार्गदर्शिका</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="customer" className="text-xs">Customer</TabsTrigger>
            <TabsTrigger value="admin" className="text-xs">Admin</TabsTrigger>
            <TabsTrigger value="helpdesk" className="text-xs">Helpdesk</TabsTrigger>
            <TabsTrigger value="trainer" className="text-xs">Trainer</TabsTrigger>
          </TabsList>

          {/* ======================== CUSTOMER GUIDE ======================== */}
          <TabsContent value="customer">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold mb-1">Customer Guide / ग्राहक गाइड</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">चांदनी चौक में अपनी मंज़िल तक पहुंचने के लिए इस ऐप का उपयोग करें</p>

                <Section icon={QrCode} title="Step 1: QR Code स्कैन करें">
                  <Step num="1">
                    <p>दुकान या इनविटेशन पर दिए गए <strong>QR Code</strong> को अपने फोन के कैमरे से स्कैन करें।</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Scan the QR code given on the shop card or invitation using your phone camera.</p>
                  </Step>
                  <Step num="2">
                    <p>QR स्कैन करने पर एक पेज खुलेगा जहाँ <strong>अपना नाम</strong> और <strong>फोन नंबर</strong> डालें।</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">A page will open asking for your name and phone number. Enter these details.</p>
                  </Step>
                  <Step num="3">
                    <p><strong>"Start Navigation"</strong> बटन दबाएं। आपका सेशन शुरू हो जाएगा।</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Press "Start Navigation" button. Your navigation session will begin.</p>
                  </Step>
                  <div className="p-3 rounded-lg bg-[hsl(var(--muted))] text-xs mt-2">
                    <strong>बिना QR के?</strong> होम पेज पर जाएं और कोड टाइप करें — जैसे AJPL-DEFAULT (रिटेल) या YASH-DEFAULT (होलसेल)
                  </div>
                </Section>

                <Section icon={Route} title="Step 2: रूट चुनें / Choose Your Route">
                  <Step num="1"><p>अपना <strong>शुरुआती पॉइंट</strong> चुनें — Metro Gate 5, Red Fort, Omaxe Mall, Town Hall, या Building Entrance.</p></Step>
                  <Step num="2"><p>हर रूट में <strong>समय</strong> (अनुमानित), <strong>कठिनाई</strong> (आसान/मध्यम/कठिन), और <strong>चेकपॉइंट्स की संख्या</strong> दिखेगी।</p></Step>
                  <Step num="3"><p>रूट पर टैप करें और <strong>"Start Route"</strong> बटन दबाएं।</p></Step>
                </Section>

                <Section icon={MapPin} title="Step 3: चेकपॉइंट-दर-चेकपॉइंट नेविगेशन">
                  <Step num="1"><p>हर चेकपॉइंट पर <strong>फोटो</strong>, <strong>दिशा का तीर</strong> (↑←→), और <strong>निर्देश</strong> दिखेंगे।</p></Step>
                  <Step num="2"><p><strong>"Look for"</strong> सेक्शन बताता है कि आपको क्या दिखना चाहिए — जैसे "पीली Gate 5 साइन".</p></Step>
                  <Step num="3"><p>जब आप उस जगह पहुंच जाएं, <strong>"I'm Here - Next Step"</strong> बटन दबाएं।</p></Step>
                  <Step num="4"><p>लाल <strong>"Confusion Point"</strong> वाले चेकपॉइंट पर विशेष ध्यान दें — यहां गलती होने की संभावना ज़्यादा है।</p></Step>
                </Section>

                <Section icon={HelpCircle} title="मदद चाहिए? / Need Help?">
                  <p>अगर रास्ता नहीं मिल रहा:</p>
                  <Step num="1"><p><strong>"Can't find this"</strong> — हमारी टीम को सूचित करता है कि आप इस चेकपॉइंट पर अटके हैं।</p></Step>
                  <Step num="2"><p><strong>"Help Me"</strong> — हेल्पडेस्क को तुरंत अलर्ट भेजता है।</p></Step>
                  <Step num="3"><p><strong>"Call"</strong> — सीधे दुकान पर फोन करें।</p></Step>
                  <Step num="4"><p><strong>"WhatsApp"</strong> — WhatsApp पर मदद मांगें।</p></Step>
                  <Step num="5"><p><strong>"Request Callback"</strong> — अपना नंबर दें, हम आपको कॉल करेंगे।</p></Step>
                  <Step num="6"><p><strong>"Share Location"</strong> — अपनी GPS लोकेशन हेल्पडेस्क को भेजें।</p></Step>
                </Section>

                <Section icon={Compass} title="Where Am I? / मैं कहाँ हूँ?">
                  <p>अगर आप पूरी तरह खो गए हैं:</p>
                  <Step num="1"><p><strong>"Where Am I?"</strong> पेज पर जाएं।</p></Step>
                  <Step num="2"><p>आप जो देख रहे हैं वो लिखें — जैसे "narrow lane", "silver shops", "building entrance".</p></Step>
                  <Step num="3"><p>Quick options में से चुनें — जैसे "Near metro gate", "Stairs visible" आदि।</p></Step>
                  <Step num="4"><p>ऐप आपको सबसे करीबी चेकपॉइंट बताएगा।</p></Step>
                </Section>

                <Section icon={Navigation} title="Treasure Map / खज़ाने का नक्शा">
                  <p><strong>"View Map"</strong> बटन से पूरा रूट एक नक्शे की तरह दिखता है। हरे चेकपॉइंट = पूरे हो चुके, चमकता हुआ = अभी यहां हैं।</p>
                </Section>

                {/* AJPL Extras */}
                <div className="mt-4 p-4 rounded-lg border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.05)]">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><Coins className="w-4 h-4 text-[hsl(var(--gold))]" /> AJPL ग्राहकों के लिए अतिरिक्त / AJPL Customer Extras</h4>
                  <p className="text-xs mb-2"><strong>Gold Rate:</strong> आज का सोने का भाव (24K, 22K, 18K) — लैंडिंग पेज पर दिखता है।</p>
                  <p className="text-xs mb-2"><strong>Design Gallery:</strong> ज्वेलरी डिज़ाइन की गैलरी देखें।</p>
                  <p className="text-xs"><strong>Rate Calculator:</strong> वज़न और कैरट डालकर अनुमानित कीमत जानें।</p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-2">ये फ़ीचर्स सिर्फ AJPL ग्राहकों को दिखते हैं। Yash Ornaments ग्राहकों को ये नहीं दिखेंगे।</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======================== ADMIN GUIDE ======================== */}
          <TabsContent value="admin">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold mb-1">Admin Guide / एडमिन गाइड</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">पूरे सिस्टम को manage करें — रूट, यूज़र, सेशन, QR, ब्रांडिंग</p>

                <Section icon={Shield} title="लॉगिन / Login">
                  <Step num="1"><p><strong>/login</strong> पेज पर जाएं।</p></Step>
                  <Step num="2"><p><strong>Username</strong> (जैसे "admin") और <strong>OTP</strong> डालें।</p></Step>
                  <Step num="3"><p>OTP Admin Panel से generate होता है (Users सेक्शन में)।</p></Step>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Testing के लिए: username "admin", OTP "admin123"</p>
                </Section>

                <Section icon={Navigation} title="Dashboard — लाइव सेशन मॉनिटरिंग">
                  <Step num="1"><p><strong>Dashboard</strong> पर Active Sessions, Completed, Help Pending, Callbacks की संख्या दिखती है।</p></Step>
                  <Step num="2"><p>Live Map में <strong>लाल dots = AJPL</strong> ग्राहक, <strong>नीले dots = Yash</strong> ग्राहक।</p></Step>
                  <Step num="3"><p>किसी भी session पर click करके उसकी <strong>पूरी timeline</strong> देखें।</p></Step>
                  <Step num="4"><p>ज़रूरत पड़ने पर session <strong>terminate</strong> भी कर सकते हैं।</p></Step>
                </Section>

                <Section icon={Route} title="Routes & Checkpoints — रूट बनाना">
                  <Step num="1"><p><strong>"New Route"</strong> बटन से नया रूट बनाएं — नाम, start type (Metro/Red Fort/Omaxe...), difficulty, estimated time।</p></Step>
                  <Step num="2"><p>रूट सेलेक्ट करके <strong>"Add Checkpoint"</strong> से चेकपॉइंट जोड़ें।</p></Step>
                  <Step num="3"><p>चेकपॉइंट editor में <strong>4 tabs</strong> हैं:</p>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      <li><strong>Details:</strong> नाम, direction (↑←→), instruction, landmark, risk level</li>
                      <li><strong>Photo & Video:</strong> फोटो/वीडियो upload करें (auto watermark लगेगा)</li>
                      <li><strong>Arrow Map:</strong> दिशा दिखाने वाली arrow image upload करें</li>
                      <li><strong>AR / Compass:</strong> compass heading (0-360°) सेट करें और lat/lng डालें</li>
                    </ul>
                  </Step>
                  <Step num="4"><p>सभी uploads पर <strong>"YASH ORNAMENTS" watermark</strong> अपने-आप लग जाता है।</p></Step>
                </Section>

                <Section icon={QrCode} title="QR Code Generation / QR कोड बनाना">
                  <Step num="1"><p><strong>QR Codes</strong> पेज पर जाएं (sidebar में)।</p></Step>
                  <Step num="2"><p><strong>Business</strong> चुनें — AJPL (retail) या Yash Ornaments (wholesale)।</p></Step>
                  <Step num="3"><p>Campaign name डालें (optional) — जैसे "metro-promo".</p></Step>
                  <Step num="4"><p><strong>"Generate QR Code"</strong> बटन दबाएं — QR तुरंत बनेगा।</p></Step>
                  <Step num="5"><p>QR को <strong>Download</strong> करें, <strong>Print</strong> करें, या link <strong>Copy</strong> करें।</p></Step>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">जब ग्राहक इस QR को स्कैन करेगा, उसे नाम/नंबर का फॉर्म दिखेगा और सही business की ब्रांडिंग आएगी।</p>
                </Section>

                <Section icon={Users} title="Users & OTP — यूज़र मैनेजमेंट">
                  <Step num="1"><p><strong>Users</strong> पेज से नए Helpdesk Agent या Map Trainer बनाएं।</p></Step>
                  <Step num="2"><p>हर user के लिए <strong>"OTP"</strong> बटन से OTP generate करें — 2 घंटे में expire होगा।</p></Step>
                  <Step num="3"><p>User को <strong>Active/Inactive</strong> toggle से तुरंत block/unblock करें।</p></Step>
                </Section>

                <Section icon={Coins} title="Gold Rate — सोने का भाव (सिर्फ AJPL)">
                  <Step num="1"><p><strong>Gold Rates</strong> पेज पर 24K, 22K, 18K rate डालें।</p></Step>
                  <Step num="2"><p><strong>"Update Gold Rates"</strong> बटन दबाएं।</p></Step>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">ये rates सिर्फ AJPL ग्राहकों को दिखते हैं।</p>
                </Section>

                <Section icon={Paintbrush} title="Branding Settings — ब्रांडिंग सेटिंग्स">
                  <Step num="1"><p><strong>Branding</strong> पेज पर watermark text, opacity, font size, rotation सेट करें।</p></Step>
                  <Step num="2"><p>Navigation footer text बदलें — जैसे "Navigation powered by YASH ORNAMENTS".</p></Step>
                  <Step num="3"><p>Preview section में देखें कि watermark कैसा दिखेगा।</p></Step>
                </Section>

                <Section icon={Image} title="Media Management — मीडिया मैनेजमेंट">
                  <Step num="1"><p><strong>Media</strong> पेज पर सभी uploaded images/videos दिखती हैं।</p></Step>
                  <Step num="2"><p>हर image पर <strong>green "Watermarked" badge</strong> confirm करता है कि watermark लग चुका है।</p></Step>
                  <Step num="3"><p>नई media <strong>"Upload Media"</strong> बटन से upload करें।</p></Step>
                </Section>

                <Section icon={BarChart3} title="Analytics — विश्लेषण">
                  <Step num="1"><p><strong>Analytics</strong> पेज पर All/AJPL/Yash tab से segmented data देखें।</p></Step>
                  <Step num="2"><p>Total sessions, completion rate, helpdesk resolution rate।</p></Step>
                  <Step num="3"><p>Top drop-off checkpoints — कहाँ ग्राहक सबसे ज़्यादा अटकते हैं।</p></Step>
                </Section>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======================== HELPDESK GUIDE ======================== */}
          <TabsContent value="helpdesk">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold mb-1">Helpdesk Guide / हेल्पडेस्क गाइड</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">ग्राहकों की real-time सहायता करें</p>

                <Section icon={Shield} title="लॉगिन">
                  <p>Admin से मिले <strong>username और OTP</strong> से /login पर login करें। Helpdesk role automatically assign होगा।</p>
                </Section>

                <Section icon={Headphones} title="Dashboard — सहायता कतार">
                  <Step num="1"><p>Login के बाद <strong>Helpdesk Dashboard</strong> खुलेगा।</p></Step>
                  <Step num="2"><p>बाईं तरफ <strong>Notifications</strong> दिखेंगे — जब कोई ग्राहक "Help Me" दबाता है, callback मांगता है, या location share करता है।</p></Step>
                  <Step num="3"><p>दाईं तरफ <strong>Cases</strong> की list है — Open, Acknowledged, In Progress, Resolved tabs से filter करें।</p></Step>
                </Section>

                <Section icon={AlertTriangle} title="Case Handle करना">
                  <Step num="1"><p><strong>"Acknowledge"</strong> — case देख लिया है, काम शुरू कर रहे हैं।</p></Step>
                  <Step num="2"><p><strong>"Call"</strong> — ग्राहक को फोन करें (अगर नंबर available है)।</p></Step>
                  <Step num="3"><p><strong>"Guided"</strong> — ग्राहक को दिशा-निर्देश दे दिए हैं।</p></Step>
                  <Step num="4"><p><strong>"Resolve"</strong> — ग्राहक की समस्या हल हो गई।</p></Step>
                </Section>

                <Section icon={Phone} title="Callback Requests">
                  <p>बाईं तरफ <strong>"Pending Callbacks"</strong> section में ग्राहकों के नाम और नंबर दिखते हैं जिन्होंने callback मांगा है।</p>
                  <p>नंबर पर click करके तुरंत call कर सकते हैं।</p>
                </Section>

                <Section icon={MapPin} title="ग्राहक की Location समझना">
                  <p>हर case में दिखता है:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                    <li><strong>Business:</strong> AJPL या Yash (लाल/नीला dot से पहचानें)</li>
                    <li><strong>Last Checkpoint:</strong> ग्राहक आखिरी बार कहाँ था</li>
                    <li><strong>Time:</strong> कब request आई</li>
                    <li><strong>Phone:</strong> अगर ग्राहक ने नंबर दिया है</li>
                  </ul>
                </Section>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======================== TRAINER GUIDE ======================== */}
          <TabsContent value="trainer">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold mb-1">Map Trainer Guide / मैप ट्रेनर गाइड</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">रूट रिकॉर्ड करें, चेकपॉइंट बनाएं, मीडिया अपलोड करें</p>

                <Section icon={Shield} title="लॉगिन">
                  <p>Admin से मिले <strong>username और OTP</strong> से login करें। Trainer role के साथ Routes पेज खुलेगा।</p>
                </Section>

                <Section icon={Route} title="नया रूट बनाना / Create New Route">
                  <Step num="1"><p><strong>"New Route"</strong> बटन दबाएं।</p></Step>
                  <Step num="2"><p>रूट का <strong>नाम</strong> दें — जैसे "Metro Gate 3 से".</p></Step>
                  <Step num="3"><p><strong>Start Type</strong> चुनें — Metro, Red Fort, Omaxe, Town Hall, Building Entrance, या Custom।</p></Step>
                  <Step num="4"><p><strong>Difficulty</strong> (Easy/Moderate/Hard) और <strong>Estimated Time</strong> (मिनट) सेट करें।</p></Step>
                  <Step num="5"><p><strong>"Create Route"</strong> बटन दबाएं।</p></Step>
                </Section>

                <Section icon={MapPin} title="Checkpoint जोड़ना / Adding Checkpoints">
                  <Step num="1"><p>बनाए गए रूट पर click करें, फिर <strong>"Add Checkpoint"</strong> बटन दबाएं।</p></Step>
                  <Step num="2"><p><strong>Details Tab:</strong>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                      <li>नाम (जैसे "Metro Gate 5 Exit")</li>
                      <li>Direction — Straight(सीधे), Left(बाएं), Right(दाएं), Enter(अंदर जाएं), Climb(ऊपर चढ़ें), Destination(मंज़िल)</li>
                      <li>Short Instruction — मुख्य निर्देश (1 लाइन)</li>
                      <li>Long Instruction — विस्तृत निर्देश</li>
                      <li>Landmark — पहचान के लिए कोई निशानी</li>
                      <li>What to Look For — ग्राहक को क्या दिखना चाहिए</li>
                      <li>Risk Level — Low/Medium/High (High = confusion point)</li>
                      <li>Indoor toggle — अगर building के अंदर है</li>
                      <li>Floor — अगर indoor है तो कौनसी मंज़िल</li>
                    </ul>
                  </p></Step>
                </Section>

                <Section icon={Image} title="Photo & Video Upload / फोटो-वीडियो अपलोड">
                  <Step num="1"><p><strong>Media Tab</strong> पर जाएं।</p></Step>
                  <Step num="2"><p><strong>Checkpoint Photo:</strong> उस जगह की फोटो upload करें जो ग्राहक को दिखनी चाहिए।</p></Step>
                  <Step num="3"><p><strong>Short Video:</strong> 10-30 सेकंड का छोटा वीडियो — रास्ता दिखाते हुए।</p></Step>
                  <Step num="4"><p>Upload होते ही <strong>"YASH ORNAMENTS" watermark</strong> अपने-आप लग जाएगा।</p></Step>
                  <div className="p-2 rounded bg-yellow-50 border border-yellow-200 text-xs text-yellow-800 mt-2">
                    <strong>सुझाव:</strong> फोटो साफ और bright रखें। Landmark clearly दिखना चाहिए। वीडियो में आवाज़ में भी direction बता सकते हैं।
                  </div>
                </Section>

                <Section icon={Navigation} title="Arrow Map — दिशा नक्शा">
                  <Step num="1"><p><strong>Arrow Map Tab</strong> पर जाएं।</p></Step>
                  <Step num="2"><p>एक <strong>arrow direction image</strong> upload करें — जो दिखाए कि कहाँ मुड़ना है।</p></Step>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">ये image ग्राहक को तब दिखती है जब GPS कमज़ोर हो या photo load न हो।</p>
                </Section>

                <Section icon={Compass} title="AR / Compass — Augmented Reality सेटअप">
                  <Step num="1"><p><strong>AR/Compass Tab</strong> पर जाएं।</p></Step>
                  <Step num="2"><p><strong>Compass Heading</strong> सेट करें (0° से 360°):
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5 text-xs">
                      <li>0° = उत्तर (North)</li>
                      <li>90° = पूर्व (East)</li>
                      <li>180° = दक्षिण (South)</li>
                      <li>270° = पश्चिम (West)</li>
                    </ul>
                  </p></Step>
                  <Step num="3"><p>Visual compass preview में लाल सुई आपकी heading दिखाती है।</p></Step>
                  <Step num="4"><p><strong>Lat/Lng</strong> (अनुमानित coordinates) भी डालें — Google Maps से ले सकते हैं।</p></Step>
                  <div className="p-2 rounded bg-blue-50 border border-blue-200 text-xs text-blue-800 mt-2">
                    <Camera className="w-3 h-3 inline mr-1" />
                    <strong>AR कैसे काम करता है:</strong> जब ग्राहक camera mode खोलता है, ऐप phone का compass reading आपकी set की हुई heading से compare करता है और screen पर arrow दिखाता है — "सीधे चलें", "बाएं मुड़ें", आदि।
                  </div>
                </Section>

                <Section icon={CheckCircle2} title="Checkpoint Save करना">
                  <p>सभी details, media, arrow map, और AR heading भरने के बाद <strong>"Add Checkpoint" / "Update Checkpoint"</strong> बटन दबाएं।</p>
                  <p>Checkpoint list में जुड़ जाएगा। फिर अगला checkpoint जोड़ें।</p>
                </Section>

                <div className="mt-4 p-4 rounded-lg border border-[hsl(var(--brand)/0.3)] bg-[hsl(var(--brand)/0.05)]">
                  <h4 className="font-semibold text-sm mb-2">Best Practices / सर्वोत्तम तरीके:</h4>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>हर रूट में कम से कम <strong>5-8 checkpoints</strong> रखें</li>
                    <li><strong>High Risk</strong> checkpoints पर ज़्यादा detail दें — ये वो जगहें हैं जहां ग्राहक अक्सर भटकते हैं</li>
                    <li>Building entrance और floor change पर <strong>अलग checkpoint</strong> रखें</li>
                    <li>फोटो <strong>दिन के समय</strong> और <strong>रात</strong> — दोनों upload करें (अगर संभव हो)</li>
                    <li>अगर बोर्ड बदल जाएं या renovation हो, तो <strong>checkpoints update</strong> करें</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Back button */}
        <div className="text-center mt-6 mb-8">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> वापस जाएं / Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
