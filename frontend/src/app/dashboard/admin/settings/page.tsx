"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSystemConfig, useUpdateSystemConfig } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

const fadeUp={hidden:{opacity:0,y:16},show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}}};
const stagger={hidden:{},show:{transition:{staggerChildren:0.08}}};
const IC="w-full px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-[#0d0d0d] focus:outline-none focus:border-[#0d0d0d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,0.2)] transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

type Config={max_loan_days?:number;daily_fine?:number;max_books_per_user?:number;reservation_window_hr?:number;low_stock_threshold?:number;never_returned_days?:number;enable_notifications?:boolean};

function Field({ label, hint, value, onChange }: { label:string; hint?:string; value:string; onChange:(v:string)=>void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider">{label}</label>
      <input type="number" min={0} value={value} onChange={e=>onChange(e.target.value)} className={IC}/>
      {hint&&<p className="text-[11px] text-[#0d0d0d]/30">{hint}</p>}
    </div>
  );
}

export default function AdminSettingsPage() {
  const { t }=useLanguage();
  const {data,isLoading}=useSystemConfig(); const update=useUpdateSystemConfig();
  const cfg=data?.data?.config as Config|undefined;
  const [form,setForm]=useState({max_loan_days:"14",daily_fine:"2",max_books_per_user:"3",reservation_window_hr:"24",low_stock_threshold:"2",never_returned_days:"60",enable_notifications:true});

  useEffect(()=>{
    if(!cfg) return;
    const t2=setTimeout(()=>setForm({
      max_loan_days:     String(cfg.max_loan_days??14),
      daily_fine:        String(cfg.daily_fine??2),
      max_books_per_user:String(cfg.max_books_per_user??3),
      reservation_window_hr:String(cfg.reservation_window_hr??24),
      low_stock_threshold:  String(cfg.low_stock_threshold??2),
      never_returned_days:  String(cfg.never_returned_days??60),
      enable_notifications: Boolean(cfg.enable_notifications),
    }),0);
    return ()=>clearTimeout(t2);
  },[cfg]);

  const f=(k:string)=>(v:string)=>setForm(p=>({...p,[k]:v}));

  const handleSave=async(e:React.FormEvent)=>{
    e.preventDefault();
    try{
      await update.mutateAsync({max_loan_days:Number(form.max_loan_days),daily_fine:Number(form.daily_fine),max_books_per_user:Number(form.max_books_per_user),reservation_window_hr:Number(form.reservation_window_hr),low_stock_threshold:Number(form.low_stock_threshold),never_returned_days:Number(form.never_returned_days),enable_notifications:form.enable_notifications});
      toast.success("Settings saved successfully");
    }catch{toast.error("Failed to save settings");}
  };

  const fields=[
    {key:"max_loan_days",         label:"Max Loan Days",                hint:"Default number of days a book can be borrowed"},
    {key:"daily_fine",            label:"Daily Fine (ETB)",              hint:"Fine charged per day after the due date"},
    {key:"max_books_per_user",    label:"Max Books Per User",            hint:"Maximum books a student can borrow at once"},
    {key:"reservation_window_hr", label:"Reservation Window (Hours)",   hint:"How long a notified reservation stays open"},
    {key:"low_stock_threshold",   label:"Low Stock Threshold",          hint:"Alert when available copies fall below this"},
    {key:"never_returned_days",   label:"Never Returned Alert (Days)",  hint:"Days before flagging a book as never returned"},
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <motion.div variants={fadeUp}>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Admin</p>
        <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">System Settings</h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">Configure global rental and inventory rules.</p>
      </motion.div>

      {isLoading?(
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-[#e8e4dc] p-6 space-y-4 animate-pulse">
          {[1,2,3,4,5,6].map(i=><div key={i} className="h-14 bg-[#f0eeea] rounded-xl"/>)}
        </motion.div>
      ):(
        <motion.form variants={fadeUp} onSubmit={handleSave} className="bg-white rounded-2xl border border-[#e8e4dc] p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(({key,label,hint})=>(
              <Field key={key} label={label} hint={hint} value={form[key as keyof typeof form] as string} onChange={f(key)}/>
            ))}
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-[#f5f4f0] rounded-xl border border-[#e8e4dc]">
            <div>
              <p className="text-[13px] font-bold text-[#0d0d0d]">Enable Notifications</p>
              <p className="text-[11px] text-[#0d0d0d]/40 mt-0.5">Send automated email and in-app reminders</p>
            </div>
            <button type="button" onClick={()=>setForm(p=>({...p,enable_notifications:!p.enable_notifications}))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.enable_notifications?"bg-[#0d0d0d]":"bg-[#e8e4dc]"}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${form.enable_notifications?"left-7":"left-1"}`}/>
            </button>
          </div>

          <button type="submit" disabled={update.isPending}
            className="px-6 py-3 rounded-full bg-[#0d0d0d] text-white text-[13px] font-bold disabled:opacity-50 hover:bg-[#292524] transition-colors">
            {update.isPending?"Saving…":"Save Settings"}
          </button>
        </motion.form>
      )}
    </motion.div>
  );
}
