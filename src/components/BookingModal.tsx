/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Scissors, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import { useStitchFlow } from '../context/StitchFlowContext';
import { AppointmentType } from '../types';

export const BookingModal: React.FC = () => {
  const { 
    bookingModalOpen, 
    setBookingModalOpen, 
    profiles, 
    appointments, 
    bookAppointment,
    selectedLookbookForBooking,
    setSelectedLookbookForBooking
  } = useStitchFlow();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<AppointmentType>('grand_agbada');
  const [selectedTailorId, setSelectedTailorId] = useState<string>('usr_tailor_01');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [selectedTime, setSelectedTime] = useState<string>('11:00');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('+254 ');
  const [email, setEmail] = useState<string>('');
  const [occasion, setOccasion] = useState<string>('Traditional Wedding / Ruracio');
  const [notes, setNotes] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string>('');

  if (!bookingModalOpen) return null;

  const tailors = profiles.filter(p => p.role === 'employee');

  const services: { id: AppointmentType; title: string; duration: string; price: string; description: string }[] = [
    {
      id: 'grand_agbada',
      title: '3-Piece Grand Agbada Consultation',
      duration: '45 mins',
      price: 'Free / Complimentary',
      description: 'Calculate robe wingspan, select Guinea Brocade, and choose Hausa/Yoruba chain-stitch chest motifs.'
    },
    {
      id: 'ruracio_bridal',
      title: 'Ruracio / Traditional Bridal Fitting',
      duration: '60 mins',
      price: 'Complimentary',
      description: 'Sculpted Kitenge/Ankara corsetry, cowrie shell embroidery layout, and matching Gele headwrap draping.'
    },
    {
      id: 'senator_kaftan',
      title: 'Senator Kaftan & Tunic Tailoring',
      duration: '35 mins',
      price: 'Free',
      description: 'Mandarin collar circumference, concealed placket, and asymmetric geometric embroidery design.'
    },
    {
      id: 'kitenge_wax_styling',
      title: 'Wax Print & Authentic Textile Sourcing',
      duration: '30 mins',
      price: 'Free',
      description: 'Inspect our authentic Vlisco Hollandais, Nigerian Aso-Oke, Ghanaian Kente, and Kenyan Kikoy swatches.'
    },
    {
      id: 'basted_fitting',
      title: 'Ceremonial Basted Skeleton Fitting',
      duration: '45 mins',
      price: 'Included in order',
      description: 'First physical try-on of basted robe wings and corset structure before final embroidery locking.'
    },
    {
      id: 'final_collection',
      title: 'Final Handover with Fila Cap / Gele',
      duration: '30 mins',
      price: 'Included in order',
      description: 'Full ceremonial dress rehearsal with handcrafted Fila cap or Gele wrap prior to event day.'
    }
  ];

  const timeSlots = [
    '09:30', '11:00', '13:30', '15:00', '16:30', '18:00'
  ];

  const isSlotBooked = (dateStr: string, timeStr: string, tailorId: string) => {
    const targetIsoPrefix = `${dateStr}T${timeStr}`;
    return appointments.some(a => 
      a.assigned_tailor_id === tailorId && 
      a.slot_datetime.startsWith(targetIsoPrefix) &&
      a.status !== 'cancelled'
    );
  };

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
  };

  const handleBack = () => {
    if (step === 4) setStep(3);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    const combinedNotes = [
      occasion ? `Occasion: ${occasion}` : '',
      selectedLookbookForBooking ? `Inspired by Lookbook: ${selectedLookbookForBooking.title}` : '',
      notes
    ].filter(Boolean).join(' | ');

    const newApt = bookAppointment({
      client_id: `cli_${Date.now()}`,
      client_name: fullName,
      client_phone: phone,
      assigned_tailor_id: selectedTailorId,
      service_type: selectedService,
      slot_datetime: `${selectedDate}T${selectedTime}:00`,
      cultural_occasion: occasion,
      notes: combinedNotes
    });

    setConfirmedBookingId(newApt.id);
    setBookingSuccess(true);
  };

  const handleClose = () => {
    setBookingModalOpen(false);
    setSelectedLookbookForBooking(null);
    setBookingSuccess(false);
    setStep(1);
    setFullName('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E5DACB] overflow-hidden text-[#1A1715]">
        
        {/* Header */}
        <div className="bg-[#161311] text-[#FAF6F0] px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#D4A347]">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-wide">
                Book African Couture Fitting
              </h3>
            </div>
            <p className="text-xs text-[#98897C] mt-0.5">
              Personalized tailoring at our Nairobi studio or private VIP fitting for cultural ceremonies.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-[#98897C] hover:text-white p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Lookbook banner if applicable */}
        {selectedLookbookForBooking && !bookingSuccess && (
          <div className="bg-[#FAF6F0] border-b border-[#E5DACB] px-6 py-2.5 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#D4A347] shrink-0" />
            <div className="text-xs text-[#1A1715]">
              <span className="font-medium text-[#6A5D52]">Selected African Design:</span>{' '}
              <span className="font-bold">{selectedLookbookForBooking.title}</span> ({selectedLookbookForBooking.cultural_origin})
            </div>
          </div>
        )}

        {/* Step Progress indicators */}
        {!bookingSuccess && (
          <div className="bg-[#F3ECE1] px-6 py-3 border-b border-[#E5DACB]">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={step >= 1 ? 'text-[#161311]' : 'text-[#98897C]'}>1. Cultural Service</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#98897C]" />
              <span className={step >= 2 ? 'text-[#161311]' : 'text-[#98897C]'}>2. Master Artisan</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#98897C]" />
              <span className={step >= 3 ? 'text-[#161311]' : 'text-[#98897C]'}>3. Date & Slot</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#98897C]" />
              <span className={step >= 4 ? 'text-[#161311]' : 'text-[#98897C]'}>4. Details</span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6">
          {bookingSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-[#D1FAE5] text-[#065F46] rounded-full flex items-center justify-center mx-auto ring-8 ring-[#ECFDF5]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-display text-2xl font-bold text-[#161311]">
                  Ceremonial Fitting Reserved!
                </h4>
                <p className="text-sm text-[#6A5D52] max-w-md mx-auto mt-1">
                  We have reserved your consultation for <strong>{selectedDate} at {selectedTime}</strong>. Our master artisan has received your cultural event requirements.
                </p>
              </div>

              <div className="bg-[#FAF6F0] border border-[#E5DACB] rounded-2xl p-4 max-w-sm mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#6A5D52]">Appointment ID:</span>
                  <span className="font-mono font-bold text-[#161311]">{confirmedBookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A5D52]">Service:</span>
                  <span className="font-medium text-[#161311]">
                    {services.find(s => s.id === selectedService)?.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A5D52]">Occasion:</span>
                  <span className="font-medium text-[#8C6D2D]">{occasion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A5D52]">Master Artisan:</span>
                  <span className="font-medium text-[#161311]">
                    {profiles.find(p => p.id === selectedTailorId)?.full_name}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-[#161311] text-[#FAF6F0] hover:bg-[#2C241E] transition-all"
                >
                  Return to Lookbook
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* STEP 1: SERVICE SELECTION */}
              {step === 1 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#6A5D52]">
                    Select Cultural Attire Requirement
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {services.map((srv) => (
                      <button
                        key={srv.id}
                        onClick={() => setSelectedService(srv.id)}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                          selectedService === srv.id 
                            ? 'border-[#D4A347] bg-[#FAF6F0] ring-1 ring-[#D4A347]' 
                            : 'border-[#E5DACB] bg-white hover:border-[#C8B69F]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-[#161311]">
                            {srv.title}
                          </span>
                          <span className="text-[11px] font-bold text-[#8C6D2D]">
                            {srv.price}
                          </span>
                        </div>
                        <p className="text-xs text-[#6A5D52] mt-1.5 leading-relaxed">
                          {srv.description}
                        </p>
                        <div className="mt-2 text-[11px] font-medium text-[#98897C] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {srv.duration}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: MASTER ARTISAN SELECTION */}
              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#6A5D52]">
                    Choose Your Master African Fashion Artisan
                  </h4>
                  <div className="space-y-3">
                    {tailors.map((tailor) => (
                      <button
                        key={tailor.id}
                        onClick={() => setSelectedTailorId(tailor.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                          selectedTailorId === tailor.id 
                            ? 'border-[#D4A347] bg-[#FAF6F0] ring-1 ring-[#D4A347]' 
                            : 'border-[#E5DACB] bg-white hover:border-[#C8B69F]'
                        }`}
                      >
                        <img
                          src={tailor.avatar_url}
                          alt={tailor.full_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#D4A347]/50"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#161311]">
                              {tailor.full_name}
                            </span>
                            <span className="text-xs text-[#8C6D2D] font-medium">
                              {tailor.title}
                            </span>
                          </div>
                          <p className="text-xs text-[#6A5D52] mt-0.5">
                            Craft: {tailor.specialty}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: DATE & TIME */}
              {step === 3 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#6A5D52]">
                    Pick Date & Atelier Time Slot
                  </h4>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-[#6A5D52] mb-1">
                        Fitting Date:
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full text-xs px-3 py-2.5 bg-white border border-[#C8B69F] rounded-xl focus:ring-1 focus:ring-[#D4A347]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6A5D52] mb-1.5">
                      Available Studio Slots (Double-booking protected):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((slot) => {
                        const booked = isSlotBooked(selectedDate, slot, selectedTailorId);
                        const isSelected = selectedTime === slot;

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={booked}
                            onClick={() => setSelectedTime(slot)}
                            className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                              booked 
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' 
                                : isSelected 
                                  ? 'bg-[#161311] text-[#FAF6F0] border-[#161311]' 
                                  : 'bg-white text-[#161311] border-[#E5DACB] hover:border-[#D4A347]'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{slot}</span>
                            {booked && <span className="text-[10px] ml-1">(Booked)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[#FAF6F0] p-3 rounded-xl border border-[#E5DACB] text-xs text-[#6A5D52] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#D4A347] shrink-0" />
                    <span>Ceremonial fittings receive our private fitting room and dedicated mirror runway.</span>
                  </div>
                </div>
              )}

              {/* STEP 4: CLIENT DETAILS */}
              {step === 4 && (
                <form onSubmit={handleConfirm} className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#6A5D52]">
                    Patron Details & Cultural Occasion
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#6A5D52] mb-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#98897C] absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Tendai Chikore"
                          className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-[#C8B69F] rounded-xl focus:ring-1 focus:ring-[#D4A347]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#6A5D52] mb-1">
                        Phone / WhatsApp *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#98897C] absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+254 7XX XXX XXX"
                          className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-[#C8B69F] rounded-xl focus:ring-1 focus:ring-[#D4A347]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6A5D52] mb-1">
                      Cultural Occasion / Celebration
                    </label>
                    <select
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-[#C8B69F] rounded-xl focus:ring-1 focus:ring-[#D4A347]"
                    >
                      <option value="Traditional Wedding / Ruracio">Traditional Wedding / Ruracio</option>
                      <option value="Pan-African Gala & Red Carpet">Pan-African Gala & Red Carpet</option>
                      <option value="Coronation / Chieftaincy Ceremony">Coronation / Chieftaincy Ceremony</option>
                      <option value="Aso-Ebi Family Coordination">Aso-Ebi Family Coordination</option>
                      <option value="Executive Diplomatic Kaftan">Executive Diplomatic Kaftan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6A5D52] mb-1">
                      Fabric & Styling Notes (e.g., Hollandais Wax, Guinea Brocade, Aso-Oke)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Bringing 6 yards of emerald Vlisco Hollandais wax, need matching Gele headwrap and brass embroidery."
                      className="w-full text-xs p-3 bg-white border border-[#C8B69F] rounded-xl focus:ring-1 focus:ring-[#D4A347]"
                    />
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-4 py-2 border border-[#C8B69F] text-xs font-semibold rounded-xl hover:bg-gray-50 flex items-center gap-1 text-[#6A5D52]"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={!fullName || !phone}
                      className="px-6 py-2.5 bg-[#161311] text-[#FAF6F0] hover:bg-[#2C241E] disabled:opacity-50 text-xs font-semibold rounded-xl transition-all shadow-sm"
                    >
                      Confirm Atelier Slot
                    </button>
                  </div>
                </form>
              )}

              {/* Navigation controls for steps 1-3 */}
              {step < 4 && (
                <div className="flex justify-between items-center pt-6 border-t border-[#E5DACB] mt-6">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-4 py-2 border border-[#C8B69F] text-xs font-semibold rounded-xl hover:bg-gray-50 flex items-center gap-1 text-[#6A5D52]"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  ) : <div />}

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 bg-[#161311] text-[#FAF6F0] hover:bg-[#2C241E] text-xs font-semibold rounded-xl flex items-center gap-1 transition-all"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
