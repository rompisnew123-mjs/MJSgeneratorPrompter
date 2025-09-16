

import React, { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { expandIdeaWithAI, refineDetailsWithAI } from './services/geminiService';
import { PromptDetails, ImageFile } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const initialDetails: PromptDetails = {
    style: '', customStyle: '', lighting: '', effect: '',
    outfit: '', face: '', background: '', camera: '', editing: ''
};

const LoadingButtonContent: React.FC<{ text: string }> = ({ text }) => (
    <>
        <div className="spinner"></div>
        <span>{text}</span>
    </>
);

const App: React.FC = () => {
    const [details, setDetails] = useState<PromptDetails>(initialDetails);
    const [idea, setIdea] = useState('');
    const [outputPrompt, setOutputPrompt] = useState('');
    const [outfitRefs, setOutfitRefs] = useState<ImageFile[]>([]);
    const [isExpanding, setIsExpanding] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [aspectRatio, setAspectRatio] = useState('potrait');
    const [faceMode, setFaceMode] = useState<'describe' | 'reference'>('describe');
    const [canShare, setCanShare] = useState(false);


    const outfitFileInputRef = useRef<HTMLInputElement>(null);

    const handleDetailChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setDetails(prev => ({ ...prev, [id]: value }));
    };

    const handleStyleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        if (value === 'custom') {
            setDetails(prev => ({ ...prev, style: value }));
        } else {
            setDetails(prev => ({ ...prev, style: value, customStyle: '' }));
        }
    };
    
    const handleFaceModeChange = (mode: 'describe' | 'reference') => {
        setFaceMode(mode);
        if (mode === 'reference') {
            setDetails(prev => ({ ...prev, face: 'of based on the reference photo. Keep the face and expression.' }));
        } else {
            // Clear if it was the auto-generated text
            if (details.face === 'of based on the reference photo. Keep the face and expression.') {
                setDetails(prev => ({ ...prev, face: '' }));
            }
        }
    };


    const handleImageChange = (e: ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<ImageFile[]>>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files).map(file => ({
                file,
                preview: URL.createObjectURL(file)
            }));
            setter(prev => [...prev, ...files]);
        }
    };

    const removeImage = (index: number, setter: React.Dispatch<React.SetStateAction<ImageFile[]>>) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };
    
    const populateForm = useCallback((data: Partial<PromptDetails>) => {
        const STYLE_OPTIONS = ["-- Pilih Style --", "realistic photo", "digital painting", "anime style", "fantasy art", "cyberpunk art", "movie poster", "watercolor painting", "3D render", "concept art", "pixel art", "custom"];
        const styleOption = STYLE_OPTIONS.find(opt => opt.toLowerCase() === data.style?.toLowerCase());
        
        setDetails(prev => ({
            ...prev,
            ...data,
            style: styleOption || (data.style ? 'custom' : prev.style),
            customStyle: styleOption ? '' : data.style || prev.customStyle,
        }));

    }, []);

    const handleExpandIdea = async () => {
        if (!idea.trim()) {
            toast.error("Harap masukkan ide Anda terlebih dahulu.");
            return;
        }
        setIsExpanding(true);
        try {
            const result = await expandIdeaWithAI(idea);
            populateForm(result);
            toast.success("Detail berhasil dibuat oleh AI!");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Gagal menghubungi AI.");
        } finally {
            setIsExpanding(false);
        }
    };

    const handleRefineDetails = async () => {
        const hasValues = Object.values(details).some(v => v && v.trim() !== '');
        if (!hasValues) {
            toast.error("Isi setidaknya satu kolom untuk disempurnakan oleh AI.");
            return;
        }
        setIsRefining(true);
        try {
            const currentDetails = { ...details };
            if (currentDetails.style !== 'custom') {
                delete (currentDetails as Partial<PromptDetails>).customStyle;
            }
            const result = await refineDetailsWithAI(currentDetails);
            populateForm(result);
            toast.success("Detail berhasil disempurnakan oleh AI!");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Gagal menghubungi AI.");
        } finally {
            setIsRefining(false);
        }
    };
    
    const generateFinalPrompt = useCallback(() => {
        const base = 'create cinematic a';
        const promptElements = [];
    
        // 1. Style
        const finalStyle = details.style === 'custom' ? details.customStyle : details.style;
        if (finalStyle) promptElements.push(finalStyle);
    
        // 2. Object Utama (ide sederhana + face)
        const faceDescription = details.face.trim();
        let objectUtama = idea.trim();

        if (objectUtama && faceDescription && faceMode === 'describe') {
            objectUtama = `${objectUtama}, ${faceDescription}`;
        } else if (faceDescription && faceMode === 'describe') {
            objectUtama = faceDescription;
        } else if (objectUtama && faceMode === 'reference') {
            objectUtama = `${objectUtama} ${faceDescription}`;
        }

        if (objectUtama) promptElements.push(objectUtama);
    
        // 3. Outfit
        if (details.outfit) promptElements.push(`wearing ${details.outfit}`);
    
        // 4. Effect
        if (details.effect) promptElements.push(`effect: ${details.effect}`);
    
        // 5. Background
        if (details.background) promptElements.push(`in the background of ${details.background}`);
    
        // 6. Lighting
        if (details.lighting) promptElements.push(`lighting: ${details.lighting}`);
    
        // 7. Camera Angle
        if (details.camera) promptElements.push(`shot on ${details.camera}`);
    
        // 8. Detail Tambahan
        if (details.editing) promptElements.push(details.editing);
        
        // Aspect Ratio
        const aspectRatioString = aspectRatio === 'potrait' ? 'rasio 9:16' : 'rasio 16:9';
        promptElements.push(aspectRatioString);
    
        const finalPrompt = `${base} ${promptElements.filter(Boolean).join(', ')}`;
        setOutputPrompt(finalPrompt);
    
    }, [details, idea, aspectRatio, faceMode]);

    useEffect(() => {
        generateFinalPrompt();
    }, [generateFinalPrompt]);

    useEffect(() => {
        if (navigator.share) {
            setCanShare(true);
        }
    }, []);


    const handleCopy = () => {
        if (outputPrompt) {
            navigator.clipboard.writeText(outputPrompt);
            toast.success('Berhasil disalin!');
        }
    };
    
    const handleShare = async () => {
        if (outputPrompt && navigator.share) {
            try {
                await navigator.share({
                    title: 'AI Image Prompt',
                    text: `Coba prompt ini: ${outputPrompt}`,
                    url: window.location.href,
                });
                toast.success('Prompt dibagikan!');
            } catch (error) {
                console.error('Error sharing:', error);
                toast.error('Gagal membagikan prompt.');
            }
        }
    };


    const STYLE_OPTIONS = ["-- Pilih Style --", "realistic photo", "digital painting", "anime style", "fantasy art", "cyberpunk art", "movie poster", "watercolor painting", "3D render", "concept art", "pixel art", "custom"];

    const ImagePreview: React.FC<{ images: ImageFile[], onRemove: (index: number) => void }> = ({ images, onRemove }) => (
        <div className="preview-container">
            {images.map((image, index) => (
                <div key={index} className="preview-item">
                    <img src={image.preview} alt="preview" className="image-preview" />
                    <button onClick={() => onRemove(index)} className="delete-btn">&times;</button>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen">
            <Toaster position="bottom-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
            <Header />
             <main className="main-content container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Kolom Input */}
                    <div>
                        <div className="form-section">
                            <label htmlFor="gemini-idea" className="form-label">Mulai dengan Ide Sederhana (Objek Utama)</label>
                            <textarea id="gemini-idea" className="form-textarea" rows={2} placeholder="Cth: seorang ksatria di hutan ajaib, kucing di luar angkasa" value={idea} onChange={e => setIdea(e.target.value)} />
                            <button onClick={handleExpandIdea} className="primary-btn mt-4" disabled={isExpanding}>
                                {isExpanding ? <LoadingButtonContent text="Memproses..." /> : "✨ Kembangkan Ide dengan AI"}
                            </button>
                        </div>

                        <div className="form-section">
                            <label htmlFor="style" className="form-label">Style Gambar</label>
                            <select id="style" className="form-select" value={details.style} onChange={handleStyleChange}>
                                {STYLE_OPTIONS.map(opt => <option key={opt} value={opt === '-- Pilih Style --' ? '' : opt}>{opt.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                            </select>
                            {details.style === 'custom' && <input type="text" id="customStyle" className="form-input mt-2" placeholder="Masukkan style gambar manual di sini..." value={details.customStyle} onChange={handleDetailChange} />}
                        </div>
                        
                        <div className="form-section">
                            <label htmlFor="aspectRatio" className="form-label">Rasio Foto</label>
                            <select id="aspectRatio" className="form-select" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
                                <option value="potrait">Potrait</option>
                                <option value="landscape">Landscape</option>
                            </select>
                        </div>

                        <div className="form-section"><label htmlFor="lighting" className="form-label">Lighting (Pencahayaan)</label><input type="text" id="lighting" className="form-input" placeholder="Cth: soft cinematic lighting, golden hour" value={details.lighting} onChange={handleDetailChange} /></div>
                        <div className="form-section"><label htmlFor="effect" className="form-label">Effect</label><input type="text" id="effect" className="form-input" placeholder="Cth: depth of field, motion blur" value={details.effect} onChange={handleDetailChange} /></div>

                        <div className="form-section">
                            <label htmlFor="outfit" className="form-label">Outfit (Pakaian)</label>
                            <textarea id="outfit" className="form-textarea" rows={3} placeholder="Deskripsikan pakaian secara detail..." value={details.outfit} onChange={handleDetailChange} />
                            <label onClick={() => outfitFileInputRef.current?.click()} className="text-sm text-gray-400 mt-4 block cursor-pointer hover:text-indigo-400 transition-colors">Tambah Referensi Foto Pakaian...</label>
                            <input type="file" ref={outfitFileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleImageChange(e, setOutfitRefs)} />
                            <ImagePreview images={outfitRefs} onRemove={(i) => removeImage(i, setOutfitRefs)} />
                        </div>

                        <div className="form-section">
                            <label htmlFor="face" className="form-label">Referensi Wajah & Ekspresi</label>
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => handleFaceModeChange('describe')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${faceMode === 'describe' ? 'bg-indigo-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}
                                >
                                    Deskripsikan Manual
                                </button>
                                <button
                                    onClick={() => handleFaceModeChange('reference')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${faceMode === 'reference' ? 'bg-indigo-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}
                                >
                                    Gunakan Prompt Referensi
                                </button>
                            </div>
                            <textarea
                                id="face"
                                className="form-textarea"
                                rows={2}
                                placeholder="Deskripsikan wajah dan ekspresi..."
                                value={details.face}
                                onChange={handleDetailChange}
                                readOnly={faceMode === 'reference'}
                            />
                        </div>
                        
                        <div className="form-section"><label htmlFor="background" className="form-label">Background (Latar)</label><textarea id="background" className="form-textarea" rows={3} placeholder="Cth: bustling cyberpunk city street at night" value={details.background} onChange={handleDetailChange} /></div>
                        <div className="form-section"><label htmlFor="camera" className="form-label">Tipe Kamera / Angle</label><input type="text" id="camera" className="form-input" placeholder="Cth: close-up shot, wide angle lens" value={details.camera} onChange={handleDetailChange} /></div>
                        <div className="form-section"><label htmlFor="editing" className="form-label">Detail Tambahan & Editing</label><textarea id="editing" className="form-textarea" rows={3} placeholder="Cth: highly detailed, hyperrealistic, 4K" value={details.editing} onChange={handleDetailChange} /></div>
                    </div>

                    {/* Kolom Output */}
                    <div className="sticky top-8 self-start">
                        <div className="form-section">
                            <h2 className="text-xl font-semibold text-white mb-4">Generated Prompt</h2>
                            <textarea id="output-prompt" className="form-textarea h-96" readOnly placeholder="Prompt yang digabungkan akan muncul di sini..." value={outputPrompt} />
                            <div className="mt-4 grid grid-cols-1 gap-4">
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button onClick={generateFinalPrompt} className="primary-btn">Generate Prompt</button>
                                <button onClick={handleRefineDetails} className="primary-btn bg-purple-600 hover:bg-purple-700" disabled={isRefining}>
                                    {isRefining ? <LoadingButtonContent text="Memproses..."/> : "✨ Sempurnakan AI"}
                                </button>
                               </div>
                               {canShare ? (
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                       <button onClick={handleCopy} className="secondary-btn">Salin Prompt</button>
                                       <button onClick={handleShare} className="secondary-btn">Bagikan Prompt</button>
                                   </div>
                               ) : (
                                   <button onClick={handleCopy} className="secondary-btn">Salin Prompt</button>
                               )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default App;