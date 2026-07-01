import React, { useState, useEffect } from 'react';
import { Appointment, BookingDetails } from '../types';

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
    // reset spinner if appointment changed
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
        // small UX delay
        setTimeout(() => setIsAdding(false), 800);
      }
    }
  };

  // Only show confirmed UI when bookingDetails explicitly reports 'confirmed'
  if (!bookingDetails || bookingDetails.status === 'negotiating') {
    return (
      <div className="h-full w-full bg-[#09090b] flex flex-col p-8 items-center justify-center text-zinc-100">
        <div className="bg-zinc-900/80 p-8 rounded-2xl border border-zinc-800 shadow-2xl max-w-md w-full text-center backdrop-blur-md">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {bookingDetails ? 'Booking Pending' : 'No Booking'}
          </h2>

          <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
            {bookingDetails
              ? 'Your booking is still being confirmed by the provider. It will appear here once the call succeeds.'
              : 'You do not have a confirmed booking yet.'}
          </p>

          <div className="bg-zinc-950/60 rounded-xl p-4 shadow-sm border border-zinc-800 text-left mb-6">
             <div className="flex items-start mb-4">
               <div className="bg-zinc-800 p-2 rounded-lg mr-3">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
               </div>
               <div>
                 <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Location</p>
                 <p className="font-medium text-white text-sm">{appointment.providerName}</p>
               </div>
             </div>

             <div className="flex items-start mb-4">
               <div className="bg-zinc-800 p-2 rounded-lg mr-3">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
               </div>
               <div>
                 <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Date & Time</p>
                 <p className="font-medium text-white text-sm">
                   {appointment.date.toLocaleDateString()} at {appointment.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </p>
               </div>
             </div>

             <div className="flex items-start">
               <div className="bg-zinc-800 p-2 rounded-lg mr-3">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                 </svg>
               </div>
               <div>
                 <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Service</p>
                 <p className="font-medium text-white text-sm">{appointment.serviceType}</p>
               </div>
             </div>
          </div>

          <button
            disabled
            className="w-full py-3 px-4 rounded-xl font-semibold bg-zinc-800 text-zinc-500 cursor-not-allowed text-sm"
          >
            Add to Google Calendar
          </button>
        </div>
      </div>
    );
  }

  // If bookingDetails explicitly reports 'failed' show cancelled state
  if (bookingDetails?.status === 'failed') {
    return (
      <div className="h-full w-full bg-[#09090b] flex flex-col p-8 items-center justify-center text-zinc-100">
        <div className="bg-zinc-900/80 p-8 rounded-2xl border border-zinc-800 shadow-2xl max-w-md w-full text-center backdrop-blur-md">
          <div className="w-16 h-16 bg-rose-900/60 border border-rose-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Booking Cancelled</h2>
          <p className="text-zinc-400 mb-6 text-sm leading-relaxed">The call ended before the provider confirmed the appointment. No booking was made.</p>

          <button
            disabled
            className="w-full py-3 px-4 rounded-xl font-semibold bg-zinc-800 text-zinc-500 cursor-not-allowed text-sm"
          >
            Add to Google Calendar
          </button>
        </div>
      </div>
    );
  }

  // Normal confirmed UI — requires bookingDetails.status === 'confirmed'
  const isConfirmed = bookingDetails?.status === 'confirmed';

  return (
    <div className="h-full w-full bg-[#09090b] flex flex-col p-8 items-center justify-center text-zinc-100">
      <div className="bg-zinc-900/80 p-8 rounded-2xl border border-zinc-800 shadow-2xl max-w-md w-full text-center backdrop-blur-md">
        <div className="w-16 h-16 bg-emerald-600/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
        <p className="text-zinc-400 mb-6 text-sm leading-relaxed">Your appointment has been added to your calendar.</p>

        <div className="bg-zinc-950/60 rounded-xl p-4 shadow-sm border border-zinc-800 text-left mb-6">
           <div className="flex items-start mb-4">
             <div className="bg-zinc-800 p-2 rounded-lg mr-3">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
             </div>
             <div>
               <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Location</p>
               <p className="font-medium text-white text-sm">{appointment.providerName}</p>
             </div>
           </div>

           <div className="flex items-start mb-4">
             <div className="bg-zinc-800 p-2 rounded-lg mr-3">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
             </div>
             <div>
               <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Date & Time</p>
               <p className="font-medium text-white text-sm">
                 {appointment.date.toLocaleDateString()} at {appointment.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </p>
             </div>
           </div>

           <div className="flex items-start">
             <div className="bg-zinc-800 p-2 rounded-lg mr-3">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
               </svg>
             </div>
             <div>
               <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Service</p>
               <p className="font-medium text-white text-sm">{appointment.serviceType}</p>
             </div>
           </div>
        </div>

        <button
          onClick={handleAddToCalendar}
          disabled={!isConfirmed || isAdding}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all text-sm ${isAdding ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed' : (isConfirmed ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-lg' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed')}`}
        >
          {isAdding ? '🔄 Adding to Google Calendar...' : '📅 Add to Google Calendar'}
        </button>

        {/* Email Calendar Invite Section */}
        {onSendEmail && isConfirmed && (
          <div className="mt-6 pt-5 border-t border-zinc-800 text-left">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Email Calendar Invite</h4>
            <p className="text-xs text-zinc-400 mb-3">Don't have Google Calendar set up? Send a `.ics` calendar invitation file directly to your email.</p>
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
                  setEmailStatus({ type: 'error', message: '❌ Failed to send. Please ensure RESEND_API_KEY is configured in your .env file.' });
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
                placeholder="Enter your email address"
                className="flex-1 px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isSendingEmail || !emailInput.trim()}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl transition-all border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingEmail ? 'Sending...' : 'Send'}
              </button>
            </form>
            {emailStatus && (
              <p className={`text-xs mt-2.5 font-medium ${emailStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl mt-3'}`}>
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
