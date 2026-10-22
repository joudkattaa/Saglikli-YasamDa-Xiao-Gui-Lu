import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkLoaded, ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { trTR } from '@clerk/localizations';
import { shadcn } from '@clerk/themes';
import {
  Activity as ActivityIcon, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Check,
  CircleHelp, Clock3, Droplets, Footprints, Heart, Leaf, LogOut, Menu,
  Moon, Plus, Scale, Settings2, Sparkles, Trash2, Utensils, X,
} from 'lucide-react';
import {
  getGetActivitiesQueryKey, getGetDashboardQueryKey, getGetDailyLogQueryKey,
  getGetFoodsQueryKey, getGetGoalsQueryKey, getGetMealsQueryKey, getGetWeightsQueryKey,
  useCreateActivity, useCreateMeal, useCreateWeight, useDeleteActivity, useDeleteMeal,
  useDeleteWeight, useGetActivities, useGetDashboard, useGetDailyLog, useGetFoods,
  useGetGoals, useGetMeals, useGetWeights, useUpdateActivity, useUpdateGoals,
  useUpdateMeal, useUpdateWeight, useUpsertDailyLog,
} from '@workspace/api-client-react';
import type { Activity as ActivityRecord, ActivityInput, Food, GoalsInput, Meal as MealRecord, MealInput, MealUpdate } from '@workspace/api-client-react';
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
function stripBase(path: string) { return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path; }

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: {
    colorPrimary: '#526548', colorForeground: '#303b2d', colorMutedForeground: '#777d6c',
    colorDanger: '#a94f42', colorBackground: '#fbf9f2', colorInput: '#fffdf8',
    colorInputForeground: '#303b2d', colorNeutral: '#d8d8c9', fontFamily: 'DM Sans',
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbf9f2] rounded-[24px] w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#303b2d] font-semibold', headerSubtitle: 'text-[#777d6c]',
    socialButtonsBlockButtonText: 'text-[#303b2d]', formFieldLabel: 'text-[#46513d]',
    footerActionLink: 'text-[#526548]', footerActionText: 'text-[#777d6c]',
    dividerText: 'text-[#777d6c]', identityPreviewEditButton: 'text-[#526548]',
    formFieldSuccessText: 'text-[#526548]', alertText: 'text-[#a94f42]',
    logoBox: 'rounded-full', logoImage: 'rounded-full', socialButtonsBlockButton: 'rounded-xl',
    formButtonPrimary: 'rounded-xl', formFieldInput: 'rounded-xl', footerAction: 'text-[#777d6c]',
    dividerLine: 'bg-[#e2e1d6]', alert: 'rounded-xl', otpCodeFieldInput: 'rounded-xl',
    formFieldRow: 'gap-2', main: 'gap-5',
  },
};

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.round(n || 0));
const mealLabels: Record<string, string> = { kahvalti: 'Kahvaltı', ogle: 'Öğle', aksam: 'Akşam', ara: 'Ara öğün' };
const activityLabels: Record<string, string> = { yuruyus: 'Yürüyüş', kosu: 'Koşu', bisiklet: 'Bisiklet', antrenman: 'Antrenman', diger: 'Diğer' };

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== id) client.clear();
    previous.current = id;
  }), [addListener, client]);
  return null;
}

function Button({ children, onClick, variant = 'primary', type = 'button', testId, disabled = false }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'quiet' | 'outline' | 'danger';
  type?: 'button' | 'submit'; testId: string; disabled?: boolean;
}) {
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`btn btn-${variant} ${disabled ? 'opacity-50 cursor-wait' : ''}`}>{children}</button>;
}
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
function Heading({ eyebrow, title, note, action }: { eyebrow: string; title: string; note?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{note && <p className="heading-note">{note}</p>}</div>{action}</div>;
}
function QueryState({ loading, error, retry }: { loading: boolean; error: boolean; retry: () => void }) {
  if (loading) return <div className="skeleton-stack" aria-label="Yükleniyor"><i /><i /><i /></div>;
  if (error) return <div className="empty-state"><CircleHelp size={24}/><b>Bilgiler şu an yüklenemedi</b><span>Bağlantını kontrol edip yeniden deneyebilirsin.</span><Button variant="outline" onClick={retry} testId="button-retry">Yeniden dene</Button></div>;
  return null;
}
function Shell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const nav = [
    { href: '/dashboard', label: 'Genel bakış', icon: BarChart3 },
    { href: '/beslenme', label: 'Beslenme', icon: Utensils },
    { href: '/aktivite', label: 'Aktivite', icon: ActivityIcon },
    { href: '/kilo', label: 'Kilo takibi', icon: Scale },
    { href: '/hedefler', label: 'Hedefler', icon: Settings2 },
  ];
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <Link href="/dashboard" className="brand" data-testid="link-brand"><span className="brand-mark"><Leaf size={19}/></span><span>denge<small>iyi hisset, dengede kal</small></span></Link>
      <div className="nav-caption">GÜNÜN</div>
      <nav>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`nav-link ${path === href ? 'active' : ''}`} data-testid={`link-nav-${href.slice(1)}`}><Icon size={18}/><span>{label}</span>{path === href && <span className="nav-active-dot"/>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="note-icon"><Heart size={16}/></span><p>Küçük adımlar,<br/><b>iyi alışkanlıklar.</b></p></div><div className="profile"><span className="profile-avatar">{user?.firstName?.[0] || 'D'}</span><span className="profile-name">{user?.firstName || 'Merhaba'}<small>Denge hesabın</small></span><button onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-signout" aria-label="Çıkış yap"><LogOut size={16}/></button></div></div>
    </aside>
    <main className="main-area"><header className="mobile-header"><button onClick={() => setOpen(!open)} data-testid="button-menu" aria-label="Menüyü aç veya kapat">{open ? <X/> : <Menu/>}</button><Link href="/dashboard" className="brand"><span className="brand-mark"><Leaf size={17}/></span>denge</Link><span className="mobile-date">{new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'short'})}</span></header>
      <div className="main-top"><span className="date-pill"><span className="date-dot"/>{new Date().toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})}</span><span className="top-greeting">Bugün kendin için güzel bir gün.</span></div>
      <div className="page-content">{children}</div><footer className="app-footer"><span>Denge · Kendine iyi bakmanın sade hâli.</span><span>Besin değerleri tahminidir.</span></footer>
    </main>
  </div>;
}

function Home() {
  return <><Show when="signed-in"><Redirect to="/dashboard"/></Show><Show when="signed-out"><main className="landing">
    <nav className="landing-nav"><Link href="/" className="brand"><span className="brand-mark"><Leaf size={19}/></span><span>denge</span></Link><div><Link href="/sign-in" className="nav-login" data-testid="link-signin">Giriş yap</Link><Link href="/sign-up" className="btn btn-primary" data-testid="link-signup">Ücretsiz başla <ArrowRight size={16}/></Link></div></nav>
    <section className="hero"><div className="hero-copy"><span className="hero-kicker"><span/> GÜNLÜK İYİLİK HALİNE YER AÇ</span><h1>Daha iyi hissetmek,<br/><em>küçük şeylerle</em><br/>başlar.</h1><p>Yediklerini, hareketini ve sana iyi gelen alışkanlıkları tek bir sakin yerde takip et. Denge, kendine ayırdığın küçük bir alan.</p><div className="hero-actions"><Link href="/sign-up" className="btn btn-primary btn-large" data-testid="link-hero-start">Kendi ritmini bul <ArrowRight size={17}/></Link><span><Heart size={15}/> Kusursuz olmak zorunda değil.</span></div></div>
      <div className="hero-art" aria-label="Günlük denge özeti"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="sun-disc"><div className="sun-leaf"><Leaf size={46}/></div></div><div className="float-card calorie-float"><span className="float-icon"><Utensils size={15}/></span><span><b>Bugün</b><small>iyi seçimler yaptın</small></span><span className="float-check"><Check size={14}/></span></div><div className="float-card water-float"><span className="water-drop"><Droplets size={17}/></span><span><b>Bir yudum daha</b><small>Kendine iyi bak</small></span></div><div className="tiny-flower flower-one"/><div className="tiny-flower flower-two"/><div className="art-caption">her gün, yeniden</div></div>
    </section>
    <section className="landing-manifesto"><div className="manifesto-number">01 / 03</div><div><p className="eyebrow">DAHA AZ BASKI, DAHA ÇOK FARKINDALIK</p><h2>Rakamların değil,<br/><span>ritminin</span> peşinden git.</h2></div><p className="manifesto-text">İyi yaşam tek bir ölçüye sığmaz. Günlük kayıtlarını tut, örüntülerini fark et ve sana uygun hedefleri kendi hızında belirle.</p></section>
    <section className="landing-features"><div className="feature-intro"><p className="eyebrow">DENGE GÜNLÜĞÜN</p><h2>İyi hissettiğin<br/>şeyleri <em>hatırla.</em></h2><p>Günlük küçük notların zamanla sana büyük resmi gösterir.</p></div><div className="feature-list"><article><span className="feature-icon sage"><Utensils size={19}/></span><div><h3>Beslenme</h3><p>Öğünlerini kaydet. Besin değerleri tahminiyle genel görünümünü takip et.</p></div><ArrowUpRight size={17}/></article><article><span className="feature-icon peach"><Footprints size={19}/></span><div><h3>Hareket</h3><p>Adımlarını ve aktivitelerini kendin gir; gününü kendine göre tamamla.</p></div><ArrowUpRight size={17}/></article><article><span className="feature-icon yellow"><Moon size={19}/></span><div><h3>İyi yaşam</h3><p>Su, uyku ve kilo geçmişine tek bakışta, yargısızca göz at.</p></div><ArrowUpRight size={17}/></article></div></section>
    <section className="landing-quote"><span>“</span><p>Bir şeyleri değiştirmek için<br/>bütün hayatını değiştirmek gerekmez.</p><small>Bugün kendin için bir küçük şey seç.</small><Link href="/sign-up" className="btn btn-primary" data-testid="link-bottom-start">Denge'ye katıl <ArrowRight size={16}/></Link></section>
    <footer className="landing-footer"><Link href="/" className="brand"><span className="brand-mark"><Leaf size={17}/></span>denge</Link><span>Kendine iyi bakmanın sade hâli.</span><span>© {new Date().getFullYear()} Denge</span></footer>
  </main></Show></>;
}

function Donut({ value, total, color = 'var(--olive)' }: { value: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return <div className="donut" style={{ background: `conic-gradient(${color} ${pct * 360}deg, #e9e8dc 0deg)` }}><div><b>{Math.round(pct * 100)}<small>%</small></b></div></div>;
}
function Metric({ icon: Icon, label, value, goal, unit, tint }: { icon: typeof Droplets; label: string; value: number; goal: number; unit: string; tint: string }) {
  const pct = Math.min(goal ? value / goal * 100 : 0, 100);
  return <div className="metric"><div className={`metric-icon ${tint}`}><Icon size={18}/></div><div className="metric-top"><span>{label}</span><b>{fmt(value)}<small> {unit}</small></b></div><div className="progress"><i style={{ width: `${pct}%` }}/></div><small className="metric-foot">{fmt(value)} / {fmt(goal)} {unit}</small></div>;
}
function Dashboard() {
  const date = today();
  const q = useGetDashboard({ date });
  const logQ = useGetDailyLog({ date });
  const saveLog = useUpsertDailyLog();
  const qc = useQueryClient();
  const log = logQ.data;
  const [sleepDraft, setSleepDraft] = useState('');
  useEffect(() => { if (log) setSleepDraft(String(log.sleepMinutes)); }, [log]);
  const updateLog = (next: { steps: number; waterMl: number; sleepMinutes: number }) => saveLog.mutate(
    { params: { date }, data: next },
    { onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetDailyLogQueryKey({ date }) });
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey({ date }) });
    } },
  );
  const data = q.data;
  return <Shell><Heading eyebrow="BUGÜNÜN ÖZETİ" title="Merhaba, güzel bir gün." note="Her küçük seçim, kendine verdiğin bir değer."/>
    <QueryState loading={q.isLoading} error={q.isError} retry={() => q.refetch()}/>
    {data && <><div className="dashboard-grid">
      <Panel className="calorie-panel"><div className="panel-heading"><span className="eyebrow">BESLENME DENGESİ</span><span className="micro-pill"><span/> Günlük görünüm</span></div><div className="calorie-main"><Donut value={data.caloriesConsumed} total={data.calorieGoal}/><div className="calorie-readout"><span>Bugün aldığın</span><b>{fmt(data.caloriesConsumed)}<small> kcal</small></b><span className="calorie-remaining">{fmt(Math.max(data.calorieGoal-data.caloriesConsumed,0))} kcal hedefe kalan</span></div></div><div className="calorie-footer"><span><i className="legend-dot olive-dot"/>Alınan <b>{fmt(data.caloriesConsumed)}</b></span><span><i className="legend-dot cream-dot"/>Hedef <b>{fmt(data.calorieGoal)}</b></span><span><i className="legend-dot peach-dot"/>Yakılan <b>{fmt(data.caloriesBurned)}</b></span></div></Panel>
      <Panel className="macro-panel"><div className="panel-heading"><div><span className="eyebrow">BESİN DAĞILIMI</span><h3>Makro dengesi</h3></div><Utensils size={17} className="muted-icon"/></div><div className="macro-row"><span>Protein</span><div className="macro-track"><i style={{width:`${Math.min(data.protein/120*100,100)}%`}}/></div><b>{fmt(data.protein)}<small> g</small></b></div><div className="macro-row carb"><span>Karbonhidrat</span><div className="macro-track"><i style={{width:`${Math.min(data.carbohydrates/250*100,100)}%`}}/></div><b>{fmt(data.carbohydrates)}<small> g</small></b></div><div className="macro-row fat"><span>Yağ</span><div className="macro-track"><i style={{width:`${Math.min(data.fat/80*100,100)}%`}}/></div><b>{fmt(data.fat)}<small> g</small></b></div><p className="estimate-note"><Sparkles size={13}/> Besin değerleri tahminidir.</p></Panel>
    </div><div className="section-kicker"><span>GÜNLÜK RİTMİN</span><Link href="/hedefler" data-testid="link-edit-goals">Hedefleri düzenle <ArrowRight size={14}/></Link></div>
    <div className="metric-grid"><Panel><Metric icon={Footprints} label="Adımlar" value={data.steps} goal={data.stepGoal} unit="adım" tint="sage-bg"/></Panel><Panel><Metric icon={Droplets} label="Su" value={data.waterMl} goal={data.waterGoalMl} unit="ml" tint="blue-bg"/></Panel><Panel><Metric icon={Moon} label="Uyku" value={data.sleepMinutes} goal={data.sleepGoalMinutes} unit="dk" tint="lilac-bg"/></Panel></div>
    <Panel className="quick-log"><div className="quick-log-copy"><span className="eyebrow">KÜÇÜK BİR KAYIT</span><h3>Bugün kendine nasıl baktın?</h3><p>Su ve uyku bilgilerini sen girersin. Cihaz takibi yok.</p></div><div className="quick-log-actions"><button onClick={()=>updateLog({steps:log?.steps ?? data.steps,waterMl:(log?.waterMl ?? data.waterMl)+250,sleepMinutes:log?.sleepMinutes ?? data.sleepMinutes})} disabled={saveLog.isPending||logQ.isLoading} data-testid="button-add-water"><Droplets size={16}/> +250 ml su</button><label>Uyku süreni kaydet <div><input type="number" min="0" value={sleepDraft || (log?.sleepMinutes ?? data.sleepMinutes)} onChange={e=>setSleepDraft(e.target.value)} onBlur={()=>{if(sleepDraft!==''&&Number(sleepDraft)!==(log?.sleepMinutes??data.sleepMinutes))updateLog({steps:log?.steps ?? data.steps,waterMl:log?.waterMl ?? data.waterMl,sleepMinutes:Number(sleepDraft)})}} disabled={saveLog.isPending||logQ.isLoading} data-testid="input-sleep-minutes"/><span>dakika</span></div></label></div></Panel>
    <div className="lower-grid"><Panel className="steps-panel"><div className="panel-heading"><div><span className="eyebrow">SON 7 GÜN</span><h3>Adım ritmin</h3></div><Footprints size={18} className="muted-icon"/></div><StepChart values={data.weeklySteps || []}/><p className="chart-foot">Adımlarını <Link href="/aktivite">kendin kaydedebilirsin <ArrowRight size={13}/></Link></p></Panel><Panel className="weight-peek"><div className="panel-heading"><div><span className="eyebrow">KİLO TAKİBİ</span><h3>Kendi yolunda</h3></div><Scale size={18} className="muted-icon"/></div><div className="weight-numbers"><div><span>Son ölçüm</span><b>{data.latestWeightKg == null ? '—' : `${data.latestWeightKg}`}<small> kg</small></b></div><ArrowRight size={17}/><div><span>Hedef</span><b>{data.targetWeightKg == null ? '—' : `${data.targetWeightKg}`}<small> kg</small></b></div></div><Link className="text-link" href="/kilo" data-testid="link-weight-page">Kilo geçmişine git <ArrowRight size={14}/></Link></Panel></div></>}
  </Shell>;
}
function StepChart({ values }: { values: {date:string;steps:number}[] }) {
  if (!values.length) return <div className="chart-empty">Henüz haftalık kayıt yok. İlk adımını bugün ekle.</div>;
  const max = Math.max(...values.map(v=>v.steps), 1);
  return <div className="bar-chart">{values.map((v,i)=><div className="bar-column" key={`${v.date}-${i}`}><span>{fmt(v.steps)}</span><i style={{height:`${Math.max(v.steps/max*100,5)}%`}}/><small>{new Date(`${v.date}T12:00:00`).toLocaleDateString('tr-TR',{weekday:'short'})}</small></div>)}</div>;
}
function WeightTrend({ values }: { values: {date:string;weightKg:number}[] }) {
  const chartValues=[...values].sort((a,b)=>a.date.localeCompare(b.date));
  return <div className="weight-chart-wrap" data-testid="chart-weight-history" aria-label="Tarihe göre kilo değişimi">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartValues} margin={{top:12,right:12,left:4,bottom:4}}>
        <CartesianGrid vertical={false} stroke="#e9e7dd"/>
        <XAxis dataKey="date" tickFormatter={value=>new Date(`${value}T12:00:00`).toLocaleDateString('tr-TR',{day:'numeric',month:'short'})} tickLine={false} axisLine={false} minTickGap={22}/>
        <YAxis dataKey="weightKg" tickFormatter={value=>`${Number(value).toFixed(0)}`} tickLine={false} axisLine={false} width={38} domain={['auto','auto']}/>
        <Tooltip labelFormatter={value=>new Date(`${value}T12:00:00`).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})} formatter={value=>[`${Number(value).toFixed(1)} kg`,'Kilo']} contentStyle={{borderRadius:12,border:'1px solid #e8e6dc',background:'#fbf9f2'}}/>
        <Line type="monotone" dataKey="weightKg" name="Kilo" stroke="#526548" strokeWidth={2.5} dot={{r:3,fill:'#526548',strokeWidth:0}} activeDot={{r:5}}/>
      </LineChart>
    </ResponsiveContainer>
  </div>;
}

function MealForm({ foods, existing, onClose, onSave, pending, date, search, onSearch }: { foods: Food[]; existing?: MealRecord; onClose:()=>void; onSave:(data:MealInput)=>void; pending:boolean; date:string; search:string; onSearch:(value:string)=>void }) {
  const [foodId,setFoodId]=useState(existing?.foodId?.toString()||'');
  const food = foods.find(f=>String(f.id)===foodId);
  const [name,setName]=useState(existing?.name||food?.name||'');
  const [type,setType]=useState<MealInput['mealType']>(existing?.mealType||'kahvalti');
  const [grams,setGrams]=useState(String(existing?.portionGrams||food?.servingGrams||100));
  const [calories,setCalories]=useState(String(existing?.calories||food?.calories||0));
  const [protein,setProtein]=useState(String(existing?.protein||food?.protein||0));
  const [carbs,setCarbs]=useState(String(existing?.carbohydrates||food?.carbohydrates||0));
  const [fat,setFat]=useState(String(existing?.fat||food?.fat||0));
  const chooseFood=(id:string)=>{setFoodId(id);const f=foods.find(a=>String(a.id)===id);if(f){setName(f.name);setGrams(String(f.servingGrams));setCalories(String(f.calories));setProtein(String(f.protein));setCarbs(String(f.carbohydrates));setFat(String(f.fat));}};
  const submit=(e:FormEvent)=>{e.preventDefault();onSave({foodId:foodId?Number(foodId):null,name,mealType:type as MealInput['mealType'],portionGrams:Number(grams),calories:Number(calories),protein:Number(protein),carbohydrates:Number(carbs),fat:Number(fat),date});};
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal-card" onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">{existing?'KAYDI DÜZENLE':'YENİ ÖĞÜN'}</p><h2>{existing?'Öğününü güncelle':'Ne yedin?'}</h2></div><button type="button" onClick={onClose} aria-label="Kapat" data-testid="button-close-meal"><X size={19}/></button></div>
    <label className="field-label">Tahmini besin kataloğunda ara <input type="search" value={search} onChange={e=>onSearch(e.target.value)} placeholder="Besin adı yaz..." data-testid="input-food-search"/></label>
    <label className="field-label">Besin kataloğundan seç <select value={foodId} onChange={e=>chooseFood(e.target.value)} data-testid="select-food"><option value="">Katalogdan seç veya elle gir</option>{foods.map(f=><option key={f.id} value={f.id}>{f.name} · {f.calories} kcal / {f.servingGrams} g</option>)}</select></label>
    <label className="field-label">Besin adı <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Örn. mercimek çorbası" data-testid="input-meal-name"/></label>
    <div className="form-two"><label className="field-label">Öğün<select value={type} onChange={e=>setType(e.target.value as MealInput['mealType'])} data-testid="select-meal-type">{Object.entries(mealLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label className="field-label">Porsiyon (g)<input type="number" min="1" value={grams} onChange={e=>setGrams(e.target.value)} data-testid="input-meal-grams"/></label></div>
    <p className="modal-subhead">Besin değerleri · tahmini</p><div className="form-four">{[['Kalori',calories,setCalories],['Protein',protein,setProtein],['Karbonhidrat',carbs,setCarbs],['Yağ',fat,setFat]].map(([label,value,fn]:any)=><label className="field-label" key={label}>{label}<input type="number" min="0" value={value} onChange={e=>fn(e.target.value)} data-testid={`input-meal-${String(label).toLowerCase()}`}/></label>)}</div>
    <div className="modal-actions"><Button variant="outline" onClick={onClose} testId="button-cancel-meal">Vazgeç</Button><Button type="submit" disabled={pending} testId="button-save-meal">{pending?'Kaydediliyor…':existing?'Değişiklikleri kaydet':'Öğünü ekle'}</Button></div></form></div>;
}
function MealsPage() {
  const [date,setDate]=useState(today()), [modal,setModal]=useState(false), [editing,setEditing]=useState<MealRecord|undefined>(), [foodSearch,setFoodSearch]=useState('');
  const qc=useQueryClient(), mealsQ=useGetMeals({date}), foodsQ=useGetFoods(foodSearch?{search:foodSearch}:undefined), create=useCreateMeal(), update=useUpdateMeal(), del=useDeleteMeal();
  const meals=mealsQ.data||[]; const total=meals.reduce((s,m)=>s+m.calories,0);
  const done=()=>{qc.invalidateQueries({queryKey:getGetMealsQueryKey({date})});qc.invalidateQueries({queryKey:getGetDashboardQueryKey({date})});setModal(false);setEditing(undefined);};
  const save=(data:MealInput)=>editing?update.mutate({id:editing.id,data:{name:data.name,mealType:data.mealType,portionGrams:data.portionGrams,calories:data.calories,protein:data.protein,carbohydrates:data.carbohydrates,fat:data.fat} satisfies MealUpdate},{onSuccess:done}):create.mutate({data},{onSuccess:done});
  const remove=(m:MealRecord)=>{if(window.confirm(`"${m.name}" kaydını silmek istiyor musun?`))del.mutate({id:m.id},{onSuccess:()=>{qc.invalidateQueries({queryKey:getGetMealsQueryKey({date})});qc.invalidateQueries({queryKey:getGetDashboardQueryKey({date})});}});};
  const grouped=Object.keys(mealLabels).map(type=>({type,items:meals.filter(m=>m.mealType===type)}));
  return <Shell><Heading eyebrow="BESLENME GÜNLÜĞÜ" title="Öğünlerine göz at." note="Besin değerleri tahminidir; amaç farkındalık, kusursuzluk değil." action={<Button onClick={()=>{setEditing(undefined);setModal(true)}} testId="button-add-meal"><Plus size={16}/> Öğün ekle</Button>}/>
    <div className="date-control"><button onClick={()=>setDate(today())} data-testid="button-today-meals">Bugün</button><input type="date" value={date} onChange={e=>setDate(e.target.value)} data-testid="input-meal-date"/><span className="daily-total"><Utensils size={15}/> {fmt(total)} kcal kaydedildi</span></div>
    <QueryState loading={mealsQ.isLoading||foodsQ.isLoading} error={mealsQ.isError||foodsQ.isError} retry={()=>{mealsQ.refetch();foodsQ.refetch()}}/>
    {!mealsQ.isLoading&&!mealsQ.isError&&meals.length===0&&<div className="empty-state large-empty"><span className="empty-orb"><Utensils size={22}/></span><h3>Henüz öğün kaydı yok</h3><p>Bugün yediklerini ekle; günün nasıl geçtiğini birlikte görelim.</p><Button onClick={()=>setModal(true)} testId="button-empty-add-meal"><Plus size={15}/> İlk öğününü ekle</Button></div>}
    <div className="meal-groups">{grouped.filter(g=>g.items.length>0).map(group=><Panel className="meal-group" key={group.type}><div className="meal-group-title"><span className="meal-bullet"/><h3>{mealLabels[group.type]}</h3><span>{group.items.length} kayıt</span></div>{group.items.map(m=><div className="meal-row" key={m.id} data-testid={`row-meal-${m.id}`}><div className="meal-symbol"><Utensils size={17}/></div><div className="meal-name"><b>{m.name}</b><small>{fmt(m.portionGrams)} g · Protein {fmt(m.protein)} g · Karbonhidrat {fmt(m.carbohydrates)} g</small></div><div className="meal-kcal"><b>{fmt(m.calories)}</b><small>kcal</small></div><button onClick={()=>{setEditing(m);setModal(true)}} aria-label="Öğünü düzenle" data-testid={`button-edit-meal-${m.id}`}><Settings2 size={16}/></button><button onClick={()=>remove(m)} aria-label="Öğünü sil" data-testid={`button-delete-meal-${m.id}`}><Trash2 size={16}/></button></div>)}</Panel>)}</div>
    <p className="disclaimer"><Sparkles size={14}/> Besin kataloğundaki değerler porsiyon başına tahminidir. Porsiyon ve değerleri kaydetmeden önce düzenleyebilirsin.</p>
    {modal&&<MealForm foods={foodsQ.data||[]} existing={editing} onClose={()=>{setModal(false);setEditing(undefined)}} onSave={save} pending={create.isPending||update.isPending} date={date} search={foodSearch} onSearch={setFoodSearch}/>}
  </Shell>;
}

function ActivityForm({ existing, onClose, onSave, pending, date }: {existing?:ActivityRecord;onClose:()=>void;onSave:(data:ActivityInput)=>void;pending:boolean;date:string}) {
  const [type,setType]=useState<ActivityInput['type']>(existing?.type||'yuruyus'),[mins,setMins]=useState(String(existing?.durationMinutes||30)),[distance,setDistance]=useState(existing?.distanceKm==null?'':String(existing.distanceKm)),[calories,setCalories]=useState(String(existing?.estimatedCalories||0));
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal-card compact-modal" onSubmit={e=>{e.preventDefault();onSave({type,durationMinutes:Number(mins),distanceKm:distance?Number(distance):null,estimatedCalories:Number(calories),date})}}><div className="modal-heading"><div><p className="eyebrow">{existing?'KAYDI DÜZENLE':'HAREKET KAYDI'}</p><h2>Hareketini ekle.</h2></div><button type="button" onClick={onClose} aria-label="Kapat" data-testid="button-close-activity"><X size={19}/></button></div><label className="field-label">Aktivite<select value={type} onChange={e=>setType(e.target.value as ActivityInput['type'])} data-testid="select-activity-type">{Object.entries(activityLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><div className="form-two"><label className="field-label">Süre (dakika)<input type="number" min="1" value={mins} onChange={e=>setMins(e.target.value)} data-testid="input-activity-duration"/></label><label className="field-label">Mesafe (km)<input type="number" min="0" step="0.1" value={distance} onChange={e=>setDistance(e.target.value)} placeholder="İsteğe bağlı" data-testid="input-activity-distance"/></label></div><label className="field-label">Yakılan kalori (tahmini)<input type="number" min="0" value={calories} onChange={e=>setCalories(e.target.value)} data-testid="input-activity-calories"/></label><p className="estimate-note"><Sparkles size={13}/> Kalori tahmini kişiye ve aktivite yoğunluğuna göre değişebilir.</p><div className="modal-actions"><Button variant="outline" onClick={onClose} testId="button-cancel-activity">Vazgeç</Button><Button type="submit" disabled={pending} testId="button-save-activity">{pending?'Kaydediliyor…':'Aktiviteyi kaydet'}</Button></div></form></div>;
}
function ActivityPage() {
  const [date,setDate]=useState(today()),[modal,setModal]=useState(false),[editing,setEditing]=useState<ActivityRecord|undefined>(),[steps,setSteps]=useState('');
  const qc=useQueryClient(), aq=useGetActivities({date}), logQ=useGetDailyLog({date}), create=useCreateActivity(), update=useUpdateActivity(), del=useDeleteActivity(), saveLog=useUpsertDailyLog();
  useEffect(()=>{if(logQ.data)setSteps(String(logQ.data.steps))},[logQ.data]);
  const activities=aq.data||[];
  const refresh=()=>{qc.invalidateQueries({queryKey:getGetActivitiesQueryKey({date})});qc.invalidateQueries({queryKey:getGetDailyLogQueryKey({date})});qc.invalidateQueries({queryKey:getGetDashboardQueryKey({date})});setModal(false);setEditing(undefined)};
  const save=(data:ActivityInput)=>editing?update.mutate({id:editing.id,data:{type:data.type,durationMinutes:data.durationMinutes,distanceKm:data.distanceKm,estimatedCalories:data.estimatedCalories}},{onSuccess:refresh}):create.mutate({data},{onSuccess:refresh});
  const saveSteps=(e:FormEvent)=>{e.preventDefault();saveLog.mutate({params:{date},data:{steps:Number(steps),waterMl:logQ.data?.waterMl||0,sleepMinutes:logQ.data?.sleepMinutes||0}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getGetDailyLogQueryKey({date})});qc.invalidateQueries({queryKey:getGetDashboardQueryKey({date})})}})};
  const remove=(a:ActivityRecord)=>{if(window.confirm('Bu aktivite kaydını silmek istiyor musun?'))del.mutate({id:a.id},{onSuccess:refresh})};
  return <Shell><Heading eyebrow="HAREKET & AKTİVİTE" title="Kendi ritminde hareket." note="Adımlarını manuel kaydet; cihaz bağlantısı şu an bulunmuyor." action={<Button onClick={()=>{setEditing(undefined);setModal(true)}} testId="button-add-activity"><Plus size={16}/> Aktivite ekle</Button>}/>
    <div className="date-control"><button onClick={()=>setDate(today())} data-testid="button-today-activity">Bugün</button><input type="date" value={date} onChange={e=>setDate(e.target.value)} data-testid="input-activity-date"/></div>
    <div className="activity-top-grid"><Panel className="steps-entry"><div className="steps-illustration"><span><Footprints size={22}/></span><div><p className="eyebrow">GÜNLÜK ADIM</p><h2>Her adım sayılır.</h2></div></div><form onSubmit={saveSteps} className="steps-form"><label className="field-label">Bugünkü adım sayın<input type="number" min="0" value={steps} onChange={e=>setSteps(e.target.value)} placeholder="Örn. 4.250" data-testid="input-daily-steps"/></label><Button type="submit" disabled={saveLog.isPending} testId="button-save-steps">{saveLog.isPending?'Kaydediliyor…':'Adımları kaydet'}</Button></form><p className="subtle-line">Adımlar manuel girilir; otomatik cihaz takibi yoktur.</p></Panel><Panel className="activity-summary"><div className="panel-heading"><div><span className="eyebrow">BUGÜN</span><h3>Aktivite özeti</h3></div><ActivityIcon size={17} className="muted-icon"/></div><div className="summary-stat"><b>{activities.length}</b><span>aktivite kaydı</span></div><div className="summary-stat"><b>{fmt(activities.reduce((s,a)=>s+a.durationMinutes,0))}<small> dk</small></b><span>toplam hareket</span></div><div className="summary-stat"><b>{fmt(activities.reduce((s,a)=>s+a.estimatedCalories,0))}<small> kcal</small></b><span>tahmini yakım</span></div></Panel></div>
    <div className="section-kicker"><span>AKTİVİTELERİN</span><span>{activities.length} kayıt</span></div>
    <QueryState loading={aq.isLoading||logQ.isLoading} error={aq.isError||logQ.isError} retry={()=>{aq.refetch();logQ.refetch()}}/>
    {!aq.isLoading&&!aq.isError&&activities.length===0&&<div className="empty-state large-empty"><span className="empty-orb"><ActivityIcon size={22}/></span><h3>Bugün henüz hareket kaydı yok</h3><p>Yürüyüşün ya da antrenmanın için küçük bir kayıt ekle.</p><Button onClick={()=>setModal(true)} testId="button-empty-add-activity"><Plus size={15}/> Aktivite ekle</Button></div>}
    <Panel className="activity-list">{activities.map(a=><div className="activity-row" key={a.id} data-testid={`row-activity-${a.id}`}><span className="activity-round"><ActivityIcon size={17}/></span><div className="activity-title"><b>{activityLabels[a.type]||a.type}</b><small><Clock3 size={13}/> {a.durationMinutes} dakika {a.distanceKm?`· ${a.distanceKm} km`:''}</small></div><div className="activity-burn">{fmt(a.estimatedCalories)} <small>kcal tahmini</small></div><button onClick={()=>{setEditing(a);setModal(true)}} data-testid={`button-edit-activity-${a.id}`} aria-label="Aktiviteyi düzenle"><Settings2 size={16}/></button><button onClick={()=>remove(a)} data-testid={`button-delete-activity-${a.id}`} aria-label="Aktiviteyi sil"><Trash2 size={16}/></button></div>)}</Panel>
    {modal&&<ActivityForm existing={editing} onClose={()=>{setModal(false);setEditing(undefined)}} onSave={save} pending={create.isPending||update.isPending} date={date}/>}
  </Shell>;
}

function WeightPage() {
  const qc=useQueryClient(), q=useGetWeights(), goalsQ=useGetGoals(), create=useCreateWeight(), update=useUpdateWeight(), del=useDeleteWeight(), updateGoals=useUpdateGoals();
  const entries=q.data||[], [weight,setWeight]=useState(''),[date,setDate]=useState(today()),[editId,setEditId]=useState<number|null>(null),[editWeight,setEditWeight]=useState(''),[editDate,setEditDate]=useState('');
  const refresh=()=>{qc.invalidateQueries({queryKey:getGetWeightsQueryKey()});qc.invalidateQueries({queryKey:getGetGoalsQueryKey()});qc.invalidateQueries({queryKey:getGetDashboardQueryKey({date:today()})})};
  const add=(e:FormEvent)=>{e.preventDefault();if(!Number(weight))return;create.mutate({data:{weightKg:Number(weight),date}},{onSuccess:()=>{refresh();setWeight('')}})};
  const saveEdit=(id:number)=>update.mutate({id,data:{weightKg:Number(editWeight),date:editDate}},{onSuccess:()=>{refresh();setEditId(null)}});
  const remove=(id:number)=>{if(window.confirm('Bu kilo kaydını silmek istiyor musun?'))del.mutate({id},{onSuccess:refresh})};
  const latest=entries[0];
  const direction=goalsQ.data?.weightDirection;
  return <Shell><Heading eyebrow="KİLO TAKİBİ" title="İlerleme, senin tanımınla." note="Ölçümlerin yalnızca sana ait bir kayıt; karşılaştırma değil, farkındalık."/>
    <QueryState loading={q.isLoading||goalsQ.isLoading} error={q.isError||goalsQ.isError} retry={()=>{q.refetch();goalsQ.refetch()}}/>
    <div className="weight-layout"><Panel className="weight-current"><span className="eyebrow">SON ÖLÇÜM</span><div className="current-weight">{latest?latest.weightKg:'—'}<small>{latest?'kg':''}</small></div><p>{latest?new Date(`${latest.date}T12:00:00`).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}):'İlk ölçümünü eklediğinde burada görünecek.'}</p><div className="weight-direction">{direction==='ver'?<ArrowDownRight size={18}/>:direction==='al'?<ArrowUpRight size={18}/>:<Heart size={17}/>}<span>{direction==='ver'?'Kilo vermek':direction==='al'?'Kilo almak':direction==='koru'?'Kilonu korumak':'Hedef yönü'}<small>kendi hedefin doğrultusunda</small></span></div></Panel>
    <Panel className="weight-add"><span className="eyebrow">YENİ ÖLÇÜM</span><h3>Kendini nasıl hissediyorsun?</h3><p>İstersen yeni bir ölçüm kaydet. Bu bir yarış değil.</p><form onSubmit={add}><div className="form-two"><label className="field-label">Kilo (kg)<input type="number" step="0.1" min="1" required value={weight} onChange={e=>setWeight(e.target.value)} placeholder="Örn. 68,4" data-testid="input-weight"/></label><label className="field-label">Tarih<input type="date" value={date} onChange={e=>setDate(e.target.value)} data-testid="input-weight-date"/></label></div><Button type="submit" disabled={create.isPending} testId="button-add-weight"><Plus size={15}/>{create.isPending?'Kaydediliyor…':'Ölçümü kaydet'}</Button></form></Panel></div>
     <Panel className="weight-trend-panel"><div className="panel-heading"><div><span className="eyebrow">ZAMAN İÇİNDE</span><h3>Kilo değişimin</h3></div><Scale size={17} className="muted-icon"/></div>{entries.length>0?<WeightTrend values={entries}/>:<div className="chart-empty">Ölçüm eklediğinde kilo değişimin burada görünecek.</div>}</Panel>
    <div className="section-kicker"><span>ÖLÇÜM GEÇMİŞİ</span><span>{entries.length} kayıt</span></div>
    {!q.isLoading&&!q.isError&&entries.length===0&&<div className="empty-state large-empty"><span className="empty-orb"><Scale size={22}/></span><h3>Henüz ölçüm yok</h3><p>İlk kaydını eklediğinde burada geçmişini görebilirsin.</p></div>}
    <Panel className="weight-history">{entries.map(e=><div className="weight-row" key={e.id} data-testid={`row-weight-${e.id}`}>{editId===e.id?<><input type="number" step=".1" value={editWeight} onChange={ev=>setEditWeight(ev.target.value)} data-testid={`input-edit-weight-${e.id}`}/><input type="date" value={editDate} onChange={ev=>setEditDate(ev.target.value)} data-testid={`input-edit-weight-date-${e.id}`}/><Button onClick={()=>saveEdit(e.id)} testId={`button-save-weight-${e.id}`}><Check size={15}/> Kaydet</Button><Button variant="quiet" onClick={()=>setEditId(null)} testId={`button-cancel-weight-${e.id}`}>Vazgeç</Button></>:<><span className="weight-date">{new Date(`${e.date}T12:00:00`).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}</span><b>{e.weightKg}<small> kg</small></b><button onClick={()=>{setEditId(e.id);setEditWeight(String(e.weightKg));setEditDate(e.date)}} data-testid={`button-edit-weight-${e.id}`} aria-label="Ölçümü düzenle"><Settings2 size={16}/></button><button onClick={()=>remove(e.id)} data-testid={`button-delete-weight-${e.id}`} aria-label="Ölçümü sil"><Trash2 size={16}/></button></>}</div>)}</Panel>
    <div className="weight-goal-hint"><Heart size={16}/><span>Her bedenin ve her yolculuğun kendine özgü. Denge, hedeflerini senin belirlediğin şekilde takip etmene yardımcı olur.</span><Link href="/hedefler" data-testid="link-weight-goals">Hedeflere git <ArrowRight size={14}/></Link></div>
  </Shell>;
}

const goalDefaults:GoalsInput={calorieGoal:2000,stepGoal:7000,waterGoalMl:2000,sleepGoalMinutes:480,currentWeightKg:null,targetWeightKg:null,weightDirection:'koru'};
function GoalsPage() {
  const qc=useQueryClient(), q=useGetGoals(), update=useUpdateGoals();
  const [form,setForm]=useState<GoalsInput>(goalDefaults);
  useEffect(()=>{if(q.data)setForm({...q.data})},[q.data]);
  const set=(key:keyof GoalsInput,value:string)=>setForm(v=>({...v,[key]:key==='weightDirection'?value:value===''?null:Number(value)} as GoalsInput));
  const submit=(e:FormEvent)=>{e.preventDefault();update.mutate({data:form},{onSuccess:()=>{qc.invalidateQueries({queryKey:getGetGoalsQueryKey()});qc.invalidateQueries({queryKey:getGetDashboardQueryKey({date:today()})})}})};
  return <Shell><Heading eyebrow="SANA ÖZEL" title="Hedeflerini belirle." note="Bunlar kesin kurallar değil, sana yol gösteren küçük niyetler."/>
    <QueryState loading={q.isLoading} error={q.isError} retry={()=>q.refetch()}/>
    <form className="goals-layout" onSubmit={submit}><div className="goals-main"><Panel className="goal-section"><div className="goal-section-title"><span className="goal-icon sage-bg"><Utensils size={18}/></span><div><h3>Günlük beslenme</h3><p>Günün için sana uygun bir hedef belirle.</p></div></div><label className="goal-field"><span>Kalori hedefi<small>kcal / gün</small></span><input type="number" min="1" value={form.calorieGoal} onChange={e=>set('calorieGoal',e.target.value)} data-testid="input-goal-calories"/></label></Panel>
    <Panel className="goal-section"><div className="goal-section-title"><span className="goal-icon peach-bg"><Footprints size={18}/></span><div><h3>Günlük hareket</h3><p>Adım hedefini kendi yaşamına göre seç.</p></div></div><label className="goal-field"><span>Adım hedefi<small>adım / gün</small></span><input type="number" min="1" value={form.stepGoal} onChange={e=>set('stepGoal',e.target.value)} data-testid="input-goal-steps"/></label></Panel>
    <Panel className="goal-section"><div className="goal-section-title"><span className="goal-icon blue-bg"><Droplets size={18}/></span><div><h3>Su ve uyku</h3><p>Dinlenme ve su içme alışkanlığını destekle.</p></div></div><div className="form-two"><label className="goal-field"><span>Su hedefi<small>ml / gün</small></span><input type="number" min="1" value={form.waterGoalMl} onChange={e=>set('waterGoalMl',e.target.value)} data-testid="input-goal-water"/></label><label className="goal-field"><span>Uyku hedefi<small>dakika / gün</small></span><input type="number" min="1" value={form.sleepGoalMinutes} onChange={e=>set('sleepGoalMinutes',e.target.value)} data-testid="input-goal-sleep"/></label></div></Panel>
    <Panel className="goal-section"><div className="goal-section-title"><span className="goal-icon lilac-bg"><Scale size={18}/></span><div><h3>Kilo hedefin</h3><p>İstersen yönünü ve ölçülerini belirtebilirsin.</p></div></div><div className="direction-options">{[['ver','Vermek',ArrowDownRight],['koru','Korumak',Heart],['al','Almak',ArrowUpRight]].map(([key,label,Icon]:any)=><button type="button" onClick={()=>setForm(v=>({...v,weightDirection:key}))} className={form.weightDirection===key?'selected':''} key={key} data-testid={`button-weight-direction-${key}`}><Icon size={17}/>{label}</button>)}</div><div className="form-two"><label className="goal-field"><span>Mevcut kilo<small>kg · isteğe bağlı</small></span><input type="number" min="1" step=".1" value={form.currentWeightKg??''} onChange={e=>set('currentWeightKg',e.target.value)} placeholder="—" data-testid="input-goal-current-weight"/></label><label className="goal-field"><span>Hedef kilo<small>kg · isteğe bağlı</small></span><input type="number" min="1" step=".1" value={form.targetWeightKg??''} onChange={e=>set('targetWeightKg',e.target.value)} placeholder="—" data-testid="input-goal-target-weight"/></label></div></Panel></div>
    <aside className="goals-aside"><div className="goal-aside-art"><div className="goal-sun"><Leaf size={30}/></div><span>Senin için,<br/><b>senin hızında.</b></span></div><p>Hedefler değişebilir. Kendine iyi geleni keşfettikçe güncellemekten çekinme.</p><Button type="submit" disabled={update.isPending||q.isLoading} testId="button-save-goals">{update.isPending?'Kaydediliyor…':<><Check size={16}/> Hedefleri kaydet</>}</Button>{update.isSuccess&&<span className="saved-message" data-testid="status-goals-saved"><Check size={14}/> Hedeflerin kaydedildi.</span>}</aside></form>
  </Shell>;
}

function HomeRedirect() { return <><Show when="signed-in"><Redirect to="/dashboard"/></Show><Show when="signed-out"><Home/></Show></>; }
function Protected({ children }: {children:ReactNode}) { return <><Show when="signed-in">{children}</Show><Show when="signed-out"><Redirect to="/"/></Show></>; }
function SignInPage() { return <div className="auth-page"><Link href="/" className="auth-back" data-testid="link-auth-home"><span className="brand-mark"><Leaf size={18}/></span> denge</Link><p className="auth-caption">Kendine ayırdığın alana hoş geldin.</p><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}/></div>; }
function SignUpPage() { return <div className="auth-page"><Link href="/" className="auth-back" data-testid="link-auth-home"><span className="brand-mark"><Leaf size={18}/></span> denge</Link><p className="auth-caption">İyi hissetmek için küçük bir başlangıç.</p><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`}/></div>; }
function Router() {
  const [,setLocation]=useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{
    ...trTR,
    signIn:{...(trTR.signIn ?? {}),start:{...(trTR.signIn?.start ?? {}),title:'Tekrar hoş geldin',subtitle:'Denge hesabına giriş yap.'},password:{...(trTR.signIn?.password ?? {}),title:'Şifreni gir',subtitle:'Hesabına devam etmek için şifreni yaz.'}},
    signUp:{...(trTR.signUp ?? {}),start:{...(trTR.signUp?.start ?? {}),title:'Denge’ye hoş geldin',subtitle:'Kendine iyi bakmak için başlayalım.'}},
  }} routerPush={to=>setLocation(stripBase(to))} routerReplace={to=>setLocation(stripBase(to),{replace:true})}>
    <ClerkLoaded><ClerkQueryClientCacheInvalidator/>
      <Switch><Route path="/" component={HomeRedirect}/><Route path="/sign-in/*?" component={SignInPage}/><Route path="/sign-up/*?" component={SignUpPage}/>
        <Route path="/dashboard">{()=><Protected><Dashboard/></Protected>}</Route>
        <Route path="/beslenme">{()=><Protected><MealsPage/></Protected>}</Route>
        <Route path="/aktivite">{()=><Protected><ActivityPage/></Protected>}</Route>
        <Route path="/kilo">{()=><Protected><WeightPage/></Protected>}</Route>
        <Route path="/hedefler">{()=><Protected><GoalsPage/></Protected>}</Route><Route component={NotFound}/>
      </Switch>
    </ClerkLoaded>
  </ClerkProvider>;
}
function RoutedErrorBoundary({children}:{children:ReactNode}) { const [location]=useLocation();return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={basePath}><RoutedErrorBoundary><Router/></RoutedErrorBoundary></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
export default App;
