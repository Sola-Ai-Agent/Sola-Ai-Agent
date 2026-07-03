import React, { useState, useEffect } from 'react';
import { Appointment, BookingDetails } from '../types';
import { Calendar, MapPin, Activity, Check, AlertCircle, Mail, Clock, RefreshCw } from 'lucide-react';

interface CalendarViewProps {
  appointment: Appointment;
  bookingDetails?: BookingDetails;
  onAddToCalendar?: () => void;
  onSendEmail?: (email: string) => Promise<boolean>;
}

const CalendarView: React.FC<CalendarViewProps> = ({ appointment, bookingDetails, onAddToCalendar, onSendEmail }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [emailInput, setEmailInput] = useState(bookingDetails?.email || '');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setIsAdding(false);
  }, [appointment, bookingDetails]);

  useEffect(() => {
    if (bookingDetails?.email) {
      setEmailInput(bookingDetails.email);
    }
  }, [bookingDetails?.email]);

  const handleAddToCalendar = async () => {
    if (onAddToCalendar && bookingDetails?.status === 'confirmed') {
      setIsAdding(true);
      try {
        await onAddToCalendar();
      } finally {
        setTimeout(() => setIsAdding(false), 800);
      }
    }
  };

  // If bookingDetails explicitly reports 'failed' show cancelled state
  if (bookingDetails?.status === 'failed') {
    return (
      <div className="h-full w-full bg-slate-50 dark:bg-[#09090b] flex flex-col p-8 items-center justify-center text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-8 rounded-3xl premium-shadow max-w-md w-full text-center backdrop-blur-md">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <AlertCircle className="h-8 w-8 text-rose-500 dark:text-rose-400" />
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Booking Call Failed</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
            The call ended before Sola could confirm the appointment with the receptionist. Please try again.
          </p>

          <button
            disabled
            className="w-full py-3 px-4 rounded-xl font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-650 cursor-not-allowed text-sm"
          >
            Add to Google Calendar
          </button>
        </div>
      </div>
    );
  }

  // If bookingDetails explicitly reports 'confirmed' or 'negotiating'
  if (!bookingDetails || bookingDetails.status === 'negotiating') {
    return (
      <div className="h-full w-full bg-slate-50 dark:bg-[#09090b] flex flex-col p-8 items-center justify-center text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-8 rounded-3xl premium-shadow max-w-md w-full text-center backdrop-blur-md">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-pulse">
            <RefreshCw className="h-7 w-7 text-brand-600 dark:text-brand-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            {bookingDetails ? 'Booking in Progress' : 'No Active Booking'}
          </h2>

          <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
            {bookingDetails
              ? 'Sola is negotiating the slot with the receptionist. Details will be finalized shortly.'
              : 'Start a voice call with Sola to book your appointment.'}
          </p>

          <div className="bg-slate-50/50 dark:bg-zinc-950/40 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800/80 text-left mb-6 space-y-4">
             <div className="flex items-start">
               <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl mr-3.5 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                 <MapPin className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
               </div>
               <div>
                 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Location</p>
                 <p className="font-semibold text-zinc-800 dark:text-white text-sm mt-0.5">{appointment.providerName}</p>
               </div>
             </div>

             <div className="flex items-start">
               <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl mr-3.5 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                 <Calendar className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
               </div>
               <div>
                 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Requested Date & Time</p>
                 <p className="font-semibold text-zinc-800 dark:text-white text-sm mt-0.5">
                   {appointment.date.toLocaleDateString()} at {appointment.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </p>
               </div>
             </div>

             <div className="flex items-start">
               <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl mr-3.5 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                 <Activity className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
               </div>
               <div>
                 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Service</p>
                 <p className="font-semibold text-zinc-800 dark:text-white text-sm mt-0.5">{appointment.serviceType}</p>
               </div>
             </div>
          </div>

          <button
            disabled
            className="w-full py-3 px-4 rounded-xl font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed text-sm"
          >
            Add to Google Calendar
          </button>
        </div>
      </div>
    );
  }

  const isConfirmed = bookingDetails?.status === 'confirmed';

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-[#09090b] flex flex-col p-8 items-center justify-center text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-8 rounded-3xl premium-shadow max-w-md w-full text-center backdrop-blur-md">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">Booking Confirmed!</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm leading-relaxed">Your appointment has been finalized by Sola.</p>

        <div className="bg-slate-50/50 dark:bg-zinc-950/40 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800/80 text-left mb-6 space-y-4">
           <div className="flex items-start">
             <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl mr-3.5 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
               <MapPin className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
             </div>
             <div>
               <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Location</p>
               <p className="font-semibold text-zinc-800 dark:text-white text-sm mt-0.5">{appointment.providerName}</p>
             </div>
           </div>

           <div className="flex items-start">
             <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl mr-3.5 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
               <Clock className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
             </div>
             <div>
               <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Confirmed Date & Time</p>
               <p className="font-semibold text-zinc-800 dark:text-white text-sm mt-0.5">
                 {appointment.date.toLocaleDateString()} at {appointment.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </p>
             </div>
           </div>

           <div className="flex items-start">
             <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-xl mr-3.5 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
               <Activity className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
             </div>
             <div>
               <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Service</p>
               <p className="font-semibold text-zinc-800 dark:text-white text-sm mt-0.5">{appointment.serviceType}</p>
             </div>
           </div>
        </div>

        <button
          onClick={handleAddToCalendar}
          disabled={!isConfirmed || isAdding}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2 ${
            isAdding 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed' 
              : 'bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-zinc-950 active:scale-95 shadow-md shadow-brand-500/10'
          }`}
        >
          {isAdding ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Adding to Google Calendar...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              Add to Google Calendar
            </>
          )}
        </button>

        {onSendEmail && isConfirmed && (
          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-850 text-left">
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-zinc-500" />
              Email Calendar Invite
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3.5 leading-relaxed">
              Send a `.ics` calendar invitation file directly to your inbox for local mail client import.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!emailInput.trim() || isSendingEmail) return;
              setIsSendingEmail(true);
              setEmailStatus(null);
              try {
                const ok = await onSendEmail(emailInput.trim());
                if (ok) {
                  setEmailStatus({ type: 'success', message: '✓ Calendar invite sent successfully!' });
                } else {
                  setEmailStatus({ type: 'error', message: '❌ Failed to send. Ensure RESEND_API_KEY is configured in your .env file.' });
                }
              } catch (err) {
                setEmailStatus({ type: 'error', message: '❌ Error occurred during sending.' });
              } finally {
                setIsSendingEmail(false);
              }
            }} className="flex gap-2">
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={isSendingEmail || !emailInput.trim()}
                className="px-4 py-2.5 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl transition-all border border-zinc-900 dark:border-zinc-750 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isSendingEmail ? 'Sending...' : 'Send'}
              </button>
            </form>
            {emailStatus && (
              <p className={`text-xs mt-2.5 font-medium ${emailStatus.type === 'success' ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/25 px-3.5 py-2.5 rounded-xl'}`}>
                {emailStatus.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
