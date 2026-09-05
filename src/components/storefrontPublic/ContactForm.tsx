import type { FormEvent } from 'react';

type ContactFormState = {
  inquiry_type: string;
  name: string;
  email: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  message: string;
};

type Props = {
  contactForm: ContactFormState;
  contactStatus: string;
  contactSubmitting: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  setContactForm: React.Dispatch<React.SetStateAction<ContactFormState>>;
};

export default function ContactForm({
  contactForm,
  contactStatus,
  contactSubmitting,
  onSubmit,
  setContactForm,
}: Props) {
  return (
    <div className="mt-4">
      <form onSubmit={(e) => void onSubmit(e)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select value={contactForm.inquiry_type} onChange={(e) => setContactForm((prev) => ({ ...prev, inquiry_type: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg bg-white md:col-span-2"><option>General inquiry</option><option>Wedding favors</option><option>Birthday or celebration</option><option>Memorial or remembrance</option><option>Employee gifts</option><option>Realtor gifts</option><option>Corporate order</option></select>
        <input
          type="text"
          required
          placeholder="Name"
          value={contactForm.name}
          onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        <input
          type="email"
          required
          placeholder="Email Address"
          value={contactForm.email}
          onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        <input
          type="text"
          required
          placeholder="Street Address"
          value={contactForm.street_address}
          onChange={(e) => setContactForm((prev) => ({ ...prev, street_address: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white md:col-span-2"
        />
        <input
          type="text"
          required
          placeholder="City"
          value={contactForm.city}
          onChange={(e) => setContactForm((prev) => ({ ...prev, city: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        <input
          type="text"
          required
          placeholder="State"
          value={contactForm.state}
          onChange={(e) => setContactForm((prev) => ({ ...prev, state: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        <input
          type="text"
          required
          placeholder="ZIP"
          value={contactForm.zip}
          onChange={(e) => setContactForm((prev) => ({ ...prev, zip: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        <input
          type="text"
          required
          placeholder="Phone Number"
          value={contactForm.phone}
          onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
        />
        <textarea
          required
          rows={4}
          placeholder="Message"
          value={contactForm.message}
          onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white md:col-span-2"
        />
        <div className="md:col-span-2 flex items-center justify-between gap-3">
          <p
            className={`text-sm ${
              contactStatus.toLowerCase().includes('success') ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {contactStatus}
          </p>
          <button
            type="submit"
            disabled={contactSubmitting}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {contactSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  );
}
