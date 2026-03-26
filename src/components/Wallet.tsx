import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, Fingerprint, FileCheck, Wallet as WalletIcon, QrCode, CheckCircle2, AlertCircle, Download, User, MapPin, Calendar } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import { pSTNModule } from '../lib/ssi/pSTN';
import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';

export const Wallet: React.FC = () => {
  const { user, profile } = useAuth();
  const [did, setDid] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'credentials' | 'signing' | 'blockchain'>('identity');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [signedPdf, setSignedPdf] = useState<string | null>(null);
  const [location, setLocation] = useState('Metro Timur');
  const [zkpResult, setZkpResult] = useState<any>(null);

  useEffect(() => {
    // Check if user already has a DID in their profile
    if (user?.did) {
      setDid(user.did);
      setIsInitialized(true);
    }
  }, [user]);

  const initializeWallet = async () => {
    setStatus('processing');
    setMessage('Generating Secure pST-N Identifier...');
    
    try {
      // In a real app, this would use the device's Secure Enclave
      const wallet = ethers.Wallet.createRandom();
      const didDoc = await pSTNModule.generateDID(wallet);
      
      // Register DID on the mock registry
      const response = await fetch('/api/ssi/did/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: didDoc.id,
          publicKey: wallet.publicKey,
          userId: user.uid
        })
      });

      if (response.ok) {
        setDid(didDoc.id);
        setIsInitialized(true);
        setStatus('success');
        setMessage('Digital Identity Successfully Created & Registered on Blockchain!');
      } else {
        throw new Error('Failed to register DID');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to initialize identity.');
    }
  };

  const handleGenerateZKP = async () => {
    setStatus('processing');
    setMessage('Generating GENES Recursive Proof...');
    try {
      const proof = await pSTNModule.generateRecursiveProof(1995, location);
      setZkpResult(proof);
      setStatus('success');
      setMessage('ZKP Generated Successfully!');
    } catch (error) {
      setStatus('error');
      setMessage('ZKP Generation Failed.');
    }
  };

  const handleSignDocument = async () => {
    if (!passphrase || passphrase !== '123456') {
      setStatus('error');
      setMessage('Invalid Passphrase. Please use 123456 for demo.');
      return;
    }

    setStatus('processing');
    setMessage('Requesting BSSN/BSrE E-Signature...');

    try {
      // Mock PDF base64 (a blank PDF)
      const mockPdfBase64 = 'JVBERi0xLjcKCjEgMCBvYmogPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+IGVuZG9iagoyIDAgb2JqIDw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbIDMgMCBSIF0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWyAwIDAgNjEyIDc5MiBdID4+IGVuZG9iagp0cmFpbGVyIDw8IC9Sb290IDEgMCBSID4+CiUlRU9G';
      
      const response = await fetch('/api/esign/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: mockPdfBase64,
          signerName: user.displayName || 'Anonymous User',
          did: did,
          passphrase: passphrase
        })
      });

      const data = await response.json();
      if (data.success) {
        setSignedPdf(data.pdfBase64);
        setStatus('success');
        setMessage('Document Signed Successfully!');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Signing failed.');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-xl">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Nusantara Wallet</h2>
            <p className="text-xs text-blue-300 font-mono">pST-N Protocol v2.0</p>
          </div>
        </div>
        {isInitialized && (
          <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Secure</span>
          </div>
        )}
      </div>

      {!isInitialized ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
            <Fingerprint className="w-10 h-10 text-blue-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Initialize Your Identity</h3>
            <p className="text-sm text-gray-400">
              Create a secure, decentralized identifier (DID) linked to your biometric data.
            </p>
          </div>
          <button
            onClick={initializeWallet}
            disabled={status === 'processing'}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            {status === 'processing' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Key className="w-5 h-5" />
                Generate DID
              </>
            )}
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Card Identity */}
          <motion.div 
            layoutId="wallet-card"
            className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-900 rounded-3xl p-6 shadow-2xl border border-white/20"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <WalletIcon className="w-32 h-32" />
            </div>
            
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-blue-200 font-bold">Digital Identifier</p>
                  <p className="text-sm font-mono text-white truncate max-w-[200px]">{did}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-blue-200 font-bold">Holder Name</p>
                  <p className="text-lg font-bold text-white tracking-tight">{user?.displayName || 'Nusantara Citizen'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-blue-200 font-bold">Status</p>
                  <p className="text-xs font-bold text-green-400">VERIFIED</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto">
            {(['identity', 'credentials', 'signing', 'blockchain'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[80px] py-2 text-[10px] font-bold rounded-xl transition-all capitalize ${
                  activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[350px]">
            <AnimatePresence mode="wait">
              {activeTab === 'identity' && (
                <motion.div
                  key="identity"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Full Name</p>
                      <p className="text-sm text-white font-medium">{user?.displayName || 'Nusantara Citizen'}</p>
                    </div>
                  </div>
                  
                  {/* ZKP Section */}
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-white">Location Proof (ZKP)</span>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-mono">GENES Protocol</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                        placeholder="Current Location"
                      />
                      <button 
                        onClick={handleGenerateZKP}
                        className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-xl"
                      >
                        Prove
                      </button>
                    </div>

                    {zkpResult && (
                      <div className="p-3 bg-black/20 rounded-xl font-mono text-[8px] text-indigo-300 break-all">
                        {JSON.stringify(zkpResult)}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'credentials' && (
                <motion.div
                  key="credentials"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="p-6 bg-white/5 border border-white/10 rounded-3xl text-center space-y-4">
                    <div className="w-32 h-32 bg-white p-2 rounded-2xl mx-auto">
                      <QRCodeSVG value={did || ''} size={120} />
                    </div>
                    <p className="text-xs text-gray-400">Scan this QR to present your credentials using OID4VP protocol.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold px-2">Active Credentials</p>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-white font-medium">Identity Verification</span>
                      </div>
                      <span className="text-[10px] text-green-400 font-bold">VC 2.0</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'signing' && (
                <motion.div
                  key="signing"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-6 h-6 text-blue-400" />
                      <h4 className="text-white font-bold">E-Signature Module</h4>
                    </div>
                    <p className="text-xs text-blue-200">
                      Sign documents with legal validity using the BSSN/BSrE integrated pST-N protocol.
                    </p>
                  </div>

                  {!signedPdf ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold px-2">Enter Passphrase</label>
                        <input
                          type="password"
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                          placeholder="Demo: 123456"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                      <button
                        onClick={handleSignDocument}
                        disabled={status === 'processing'}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                      >
                        {status === 'processing' ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Fingerprint className="w-5 h-5" />
                            Sign Document
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-3xl text-center space-y-4">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-8 h-8 text-green-400" />
                        </div>
                        <h4 className="text-white font-bold">Document Signed!</h4>
                        <p className="text-xs text-gray-400">Your document has been cryptographically signed and verified.</p>
                        <button 
                          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 mx-auto"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `data:application/pdf;base64,${signedPdf}`;
                            link.download = 'signed_document.pdf';
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4" />
                          Download PDF
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setSignedPdf(null);
                          setPassphrase('');
                          setStatus('idle');
                        }}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                      >
                        Sign Another Document
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'blockchain' && (
                <motion.div
                  key="blockchain"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-blue-400" />
                      <h4 className="text-white font-bold text-sm">On-Chain Registry</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Network</span>
                        <span className="text-blue-400 font-bold">Hyperledger Besu (IBFT 2.0)</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Contract</span>
                        <span className="text-white font-mono">ERC-1056 Registry</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Status</span>
                        <span className="text-green-400 font-bold">SYNCHRONIZED</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold px-2">Blockchain Attributes</p>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">pSTN-Protocol</span>
                        <span className="text-xs text-white font-bold">v2.0</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Validity</span>
                        <span className="text-xs text-white font-bold">365 Days</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Status Toasts */}
      <AnimatePresence>
        {status !== 'idle' && status !== 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-4 right-4 p-4 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-xl border ${
              status === 'success' ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'
            }`}
          >
            {status === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <p className={`text-sm font-bold ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </p>
            <button 
              onClick={() => setStatus('idle')}
              className="ml-auto text-white/50 hover:text-white"
            >
              <AlertCircle className="w-4 h-4 rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
