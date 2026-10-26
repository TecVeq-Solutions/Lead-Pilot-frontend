import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { MessageSquare, ShieldAlert, Send, RefreshCw, Key } from 'lucide-react';

export const WhatsAppSettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [, setAccountData] = useState<any>(null);
  const [phoneData, setPhoneData] = useState<any>(null);

  // Connect Form State
  const [wabaId, setWabaId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Test Message State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from LeadPilot! Meta WhatsApp API is active.');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    fetchWhatsAppAccount();
  }, []);

  const fetchWhatsAppAccount = async () => {
    setLoading(true);
    try {
      const res = await api.get('/whatsapp/account');
      setConnected(res.data.connected);
      if (res.data.data) {
        setAccountData(res.data.data.account);
        setPhoneData(res.data.data.phone_number);
        if (res.data.data.account) {
          setWabaId(res.data.data.account.waba_id || '');
          setDisplayName(res.data.data.account.display_name || '');
        }
        if (res.data.data.phone_number) {
          setPhoneNumberId(res.data.data.phone_number.phone_number_id || '');
          setDisplayPhoneNumber(res.data.data.phone_number.display_phone_number || '');
          setVerifiedName(res.data.data.phone_number.verified_name || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await api.post('/whatsapp/connect', {
        waba_id: wabaId,
        display_name: displayName,
        access_token: accessToken,
        phone_number_id: phoneNumberId,
        display_phone_number: displayPhoneNumber,
        verified_name: verifiedName,
      });
      setMsg(res.data.message);
      fetchWhatsAppAccount();
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Failed to connect WhatsApp WABA credentials.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    setTestResult('');
    try {
      const res = await api.post('/whatsapp/test-message', {
        recipient_phone: testPhone,
        message: testMessage,
      });
      setTestResult(`Success! Message dispatched. WAMID: ${res.data.meta_response?.messages?.[0]?.id || 'OK'}`);
    } catch (err: any) {
      setTestResult(`Error: ${err.response?.data?.message || 'Failed to dispatch test message.'}`);
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-[#475569] font-bold text-sm">Loading Meta WABA configuration...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl font-poppins">
      <div>
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Meta WhatsApp Business Platform</h1>
        <p className="text-xs font-semibold text-[#475569] mt-1">Official Graph API v20.0 Connection & Token Security</p>
      </div>

      {/* Connection Status Card */}
      <div className={`p-6 rounded-xl border shadow-sm ${connected ? 'bg-[#ECFDF5] border-[#A7F3D0]' : 'bg-[#FFFBEB] border-[#FDE68A]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-xl border ${connected ? 'bg-[#10B981] text-white border-emerald-600' : 'bg-[#F59E0B] text-white border-amber-600'}`}>
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className={`text-base font-extrabold ${connected ? 'text-[#065F46]' : 'text-[#92400E]'}`}>
                {connected ? `Connected: ${phoneData?.verified_name}` : 'WhatsApp WABA Disconnected'}
              </div>
              <div className={`text-xs font-semibold mt-0.5 ${connected ? 'text-[#047857]' : 'text-[#B45309]'}`}>
                {connected
                  ? `Phone ID: ${phoneData?.phone_number_id} | Rating: ${phoneData?.quality_rating} | Tier: ${phoneData?.messaging_tier}`
                  : 'Enter your Meta Graph API credentials below to connect your WABA account'}
              </div>
            </div>
          </div>
          <button
            onClick={fetchWhatsAppAccount}
            className="p-2.5 bg-white border border-[#CBD5E1] rounded-lg text-slate-600 hover:text-slate-900 shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#047857] text-sm font-bold shadow-xs">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credentials Form */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-extrabold text-[#0F172A] mb-4 flex items-center gap-2 pb-3 border-b border-[#CBD5E1]">
            <Key className="w-5 h-5 text-[#0F9F8F]" /> WABA Credentials Configuration
          </h2>
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-[#334155] mb-1 uppercase tracking-wider">Meta WABA Account ID</label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="e.g. 10009988776655"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#0F9F8F] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#334155] mb-1 uppercase tracking-wider">Display Account Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Apex Motors Main WABA"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#0F9F8F] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#334155] mb-1 uppercase tracking-wider">Phone Number ID</label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 998877665544332"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#0F9F8F] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#334155] mb-1 uppercase tracking-wider">Display Phone Number</label>
              <input
                type="text"
                value={displayPhoneNumber}
                onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                placeholder="e.g. +1 415 555 0199"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#0F9F8F] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#334155] mb-1 uppercase tracking-wider">Verified Business Name</label>
              <input
                type="text"
                value={verifiedName}
                onChange={(e) => setVerifiedName(e.target.value)}
                placeholder="e.g. Apex Motors Official"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#0F9F8F] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#334155] mb-1 uppercase tracking-wider">Permanent System Access Token</label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAAG..."
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#0F9F8F] focus:bg-white font-mono"
                required
              />
              <span className="text-[11px] font-semibold text-[#475569] mt-1 block">Tokens are encrypted using AES-256-GCM at rest.</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-xs font-extrabold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {saving ? 'Saving & Encrypting...' : 'Save & Connect WABA Account'}
            </button>
          </form>
        </div>

        {/* Quick Dispatch Tester */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#0F172A] mb-4 flex items-center gap-2 pb-3 border-b border-[#CBD5E1]">
              <Send className="w-5 h-5 text-[#0F9F8F]" /> Quick Message Tester
            </h2>
            <p className="text-xs font-semibold text-[#475569] mb-4">Dispatch a test message through Meta Graph API to verify live delivery.</p>

            {testResult && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-mono font-bold ${testResult.startsWith('Success') ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]'}`}>
                {testResult}
              </div>
            )}

            <form onSubmit={handleSendTestMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#334155] mb-1 uppercase tracking-wider">Recipient Phone Number (E.164)</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. +923001234567"
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#0F9F8F] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#334155] mb-1 uppercase tracking-wider">Message Content</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#0F9F8F] focus:bg-white resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sendingTest || !connected}
                className="w-full py-3 bg-[#0F9F8F] hover:bg-[#0B897D] disabled:opacity-50 text-white text-xs font-extrabold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {sendingTest ? 'Dispatching via Meta API...' : 'Send Live Test Message'}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-[#CBD5E1] text-xs font-bold text-[#475569] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#0F9F8F]" />
            Meta Graph API v20.0 Verified Webhook Endpoint: <code className="text-[#0F9F8F] font-mono">/api/v1/webhooks/whatsapp</code>
          </div>
        </div>
      </div>
    </div>
  );
};
