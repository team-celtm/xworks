"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchApi } from '@/lib/apiClient';
import ActionModal, { ActionModalState } from './ActionModal';

const LazyRichTextEditor = dynamic(() => import('./RichTextEditor'), {
  ssr: false,
  loading: () => <div className="prompt-input" style={{ width: '100%', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>Loading Editor...</div>
});

export interface CourseFormProps {
  mode: 'admin' | 'instructor';
  isEditing: boolean;
  initialValues?: any;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
  allCategories: any[];
  allInstructors?: any[];
}

export default function CourseForm({
  mode,
  isEditing,
  initialValues,
  onSubmit,
  loading,
  allCategories,
  allInstructors = []
}: CourseFormProps) {
  const [modal, setModal] = useState<ActionModalState>({ isOpen: false, type: 'alert', title: '', message: '' });
  const showModal = (state: Omit<ActionModalState, 'isOpen'>) => setModal({ ...state, isOpen: true });
  const hideModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // Shared state
  const [learningPoints, setLearningPoints] = useState<string[]>(initialValues?.learning_points || []);
  const [requirements, setRequirements] = useState<string[]>(initialValues?.requirements || []);
  const [targetAudience, setTargetAudience] = useState<string[]>(initialValues?.target_audience || []);
  const [tagsArray, setTagsArray] = useState<string[]>(initialValues?.tags_array || []);
  const [description, setDescription] = useState(initialValues?.description || '');
  
  const [lpInput, setLpInput] = useState('');
  const [reqInput, setReqInput] = useState('');
  const [taInput, setTaInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewVideoFile, setPreviewVideoFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  // Admin specific state
  const [createLogoUrl, setCreateLogoUrl] = useState(initialValues?.logo || '');
  const [uploadingCreateLogo, setUploadingCreateLogo] = useState(false);
  const [createDetails, setCreateDetails] = useState<string[]>(initialValues?.details || ['']);
  
  useEffect(() => {
    if (initialValues) {
      setLearningPoints(initialValues.learning_points || []);
      setRequirements(initialValues.requirements || []);
      setTargetAudience(initialValues.target_audience || []);
      setTagsArray(initialValues.tags_array || []);
      setDescription(initialValues.description || '');
      if (mode === 'admin') {
         setCreateLogoUrl(initialValues.logo || '');
         setCreateDetails(initialValues.details?.length ? initialValues.details : ['']);
      }
    }
  }, [initialValues, mode]);

  const addArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string, inputSetter: React.Dispatch<React.SetStateAction<string>>) => {
    if (value.trim()) {
      setter(prev => [...prev, value.trim()]);
      inputSetter('');
    }
  };

  const removeArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCreateLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetchApi('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setCreateLogoUrl(data.url);
      } else {
        showModal({ type: 'alert', title: 'Error', message: 'Failed to upload logo.' });
      }
    } catch (err) {
      showModal({ type: 'alert', title: 'Error', message: 'Upload error.' });
    } finally {
      setUploadingCreateLogo(false);
    }
  };

  const isEmptyHtml = (html: string) => {
    if (!html) return true;
    const stripped = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
    return stripped === '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const shortDesc = formData.get('short_description')?.toString().trim() || '';
    const fullDesc = description.trim();

    if (!shortDesc) { showModal({ type: 'alert', title: 'Validation Error', message: 'Please enter a short description.' }); return; }
    if (shortDesc.length > 250) { showModal({ type: 'alert', title: 'Validation Error', message: 'Short description cannot exceed 250 characters.' }); return; }
    if (isEmptyHtml(fullDesc)) { showModal({ type: 'alert', title: 'Validation Error', message: 'Course description cannot be empty.' }); return; }
    
    // Some array validation is only for Instructor usually, but since we are unifying, we will apply it everywhere, or maybe relax it for admin if they don't want to enforce it? 
    // The instructions say "Validation: Use the same validation rules everywhere... Ensure both Admin and Instructor use identical validation logic."
    if (learningPoints.length === 0) { showModal({ type: 'alert', title: 'Validation Error', message: 'Please add at least one learning outcome.' }); return; }
    if (requirements.length === 0) { showModal({ type: 'alert', title: 'Validation Error', message: 'Please add at least one requirement.' }); return; }

    const pvu = formData.get('preview_video_url')?.toString().trim() || '';
    if (pvu && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(pvu)) {
      showModal({ type: 'alert', title: 'Validation Error', message: 'Invalid YouTube URL.' });
      return;
    }

    if (thumbnailFile) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(thumbnailFile.type)) {
        showModal({ type: 'alert', title: 'Validation Error', message: 'Thumbnail must be JPG, PNG, or WEBP.' });
        return;
      }
      if (thumbnailFile.size > 5 * 1024 * 1024) {
        showModal({ type: 'alert', title: 'Validation Error', message: 'Thumbnail size must be less than 5 MB.' });
        return;
      }
    }

    setUploadStatus(isEditing ? 'Updating Course...' : 'Preparing Draft...');
    
    try {
      let thumbnailUrl = initialValues?.thumbnail || '';
      let previewVideoUrl = initialValues?.preview_video || '';

      if (thumbnailFile) {
        setUploadStatus('Uploading Thumbnail...');
        const tFormData = new FormData();
        tFormData.append('file', thumbnailFile);
        const tRes = await fetchApi('/api/upload', { method: 'POST', body: tFormData });
        if (tRes.ok) { thumbnailUrl = (await tRes.json()).url; } 
        else { throw new Error('Failed to upload thumbnail.'); }
      }

      if (previewVideoFile) {
        setUploadStatus('Uploading Video...');
        const vFormData = new FormData();
        vFormData.append('file', previewVideoFile);
        const vRes = await fetchApi('/api/upload', { method: 'POST', body: vFormData });
        if (vRes.ok) { previewVideoUrl = (await vRes.json()).url; } 
        else { throw new Error('Failed to upload preview video.'); }
      }

      const dur_h = Number(formData.get('dur_h')) || 0;
      const dur_m = Number(formData.get('dur_m')) || 0;
      const dur_s = Number(formData.get('dur_s')) || 0;
      const totalSecs = dur_h * 3600 + dur_m * 60 + dur_s;
      const format = formData.get('format');
      const live = format === 'live';
      const nearby = format === 'inperson';

      const data: any = {
        name: formData.get('name'),
        category_id: formData.get('category_id'),
        format: formData.get('format'),
        dur: totalSecs,
        price: formData.get('price'),
        live,
        nearby,
        description: fullDesc,
        short_description: formData.get('short_description'),
        learning_points: learningPoints,
        requirements: requirements,
        target_audience: targetAudience,
        tags_array: tagsArray,
        thumbnail: thumbnailUrl || null,
        preview_video: previewVideoUrl || formData.get('preview_video_url') || null,
        difficulty: formData.get('difficulty'),
        language: formData.get('language'),
        certificate_enabled: formData.get('certificate_enabled') === 'on',
        estimated_completion: formData.get('estimated_completion')
      };

      if (mode === 'admin') {
        data.slug = formData.get('slug');
        data.instructor_id = formData.get('instructor_id');
        data.level = formData.get('level');
        data.logo = formData.get('logo') || createLogoUrl;
        data.emoji = formData.get('emoji');
        data.g = formData.get('g');
        data.tag = formData.get('tag');
        data.tag_label = formData.get('tag_label');
        data.certificate_type = formData.get('certificate_type');
        data.details = createDetails;
        data.what_you_will_learn = formData.get('what_you_will_learn'); // Admin has a textarea version too for some reason?
      }

      if (isEditing && initialValues?.id) {
        data.id = initialValues.id;
      }

      await onSubmit(data);

      if (!isEditing) {
         form.reset();
         setLearningPoints([]);
         setRequirements([]);
         setTargetAudience([]);
         setTagsArray([]);
         setDescription('');
         setThumbnailFile(null);
         setPreviewVideoFile(null);
         if (mode === 'admin') {
           setCreateLogoUrl('');
           setCreateDetails(['']);
         }
      }
    } catch (err: any) {
      showModal({ type: 'alert', title: 'Error', message: err.message || 'An error occurred during submission.' });
    } finally {
      setUploadStatus('');
    }
  };

  const btnText = isEditing ? 'Update Course' : (mode === 'admin' ? 'Create Course' : 'Create Draft Course');

  return (
    <>
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%' }}>
      
      {/* Shared Name & Admin Slug */}
      <div style={{ display: 'grid', gridTemplateColumns: mode === 'admin' ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr', gap: '24px' }}>
        <div className={mode === 'admin' ? "form-group" : ""} style={mode === 'instructor' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : {}}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Course Name</label>
          <input name="name" type="text" className="prompt-input" required placeholder="e.g. Master React in 30 Days" defaultValue={initialValues?.name} disabled={loading} style={{ width: '100%' }} />
        </div>
        {mode === 'admin' && (
          <div className="form-group">
            <label className="admin-label">Slug (URL)</label>
            <input name="slug" type="text" className="prompt-input" required placeholder="e.g. react-mastery" defaultValue={initialValues?.slug} disabled={loading} />
          </div>
        )}
      </div>

      {/* Shared Category, Format & Admin Instructor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: mode === 'admin' ? '24px' : '20px' }}>
        <div className={mode === 'admin' ? "form-group" : ""} style={mode === 'instructor' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : {}}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Category</label>
          <select name="category_id" className="prompt-input" required defaultValue={initialValues?.category_id || ''} disabled={loading} style={{ width: '100%', height: '46px' }}>
            <option value="">Select Category</option>
            {allCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.parent_name ? `— ${cat.name}` : cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className={mode === 'admin' ? "form-group" : ""} style={mode === 'instructor' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : {}}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Format</label>
          <select name="format" className="prompt-input" required defaultValue={initialValues?.format || 'live'} disabled={loading} style={{ width: '100%', height: '46px' }}>
            <option value="live">🔴 Live session</option>
            <option value="recorded" disabled>📹 Recorded (Coming Soon)</option>
            <option value="inperson" disabled>📍 In-person (Coming Soon)</option>
          </select>
        </div>
        {mode === 'admin' && (
          <div className="form-group">
            <label className="admin-label">Instructor</label>
            <select name="instructor_id" className="prompt-input" required defaultValue={initialValues?.instructor_id || ''} disabled={loading}>
              <option value="">Select Instructor</option>
              {allInstructors.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.first_name} {inst.last_name} ({inst.email})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Shared Price, Duration & Admin Level */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: mode === 'admin' ? '24px' : '20px' }}>
        <div className={mode === 'admin' ? "form-group" : ""} style={mode === 'instructor' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : {}}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Price (₹)</label>
          <input name="price" type="number" className="prompt-input" required placeholder="1299" defaultValue={initialValues?.price} disabled={loading} style={{ width: '100%' }} />
        </div>
        
        {/* Admin uses 'level', Instructor uses 'difficulty'. They map to the same conceptual field. The user requested unifying. We'll provide 'difficulty' naming to API for instructor, 'level' for Admin, but the UI is the same. */}
        {mode === 'admin' && (
          <div className="form-group">
            <label className="admin-label">Level</label>
            <select name="level" className="prompt-input" required defaultValue={initialValues?.level || initialValues?.difficulty || ''} disabled={loading}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        )}

        <div className={mode === 'admin' ? "form-group" : ""} style={mode === 'instructor' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : {}}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Duration</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input name="dur_h" type="number" min="0" className="prompt-input" placeholder="Hrs" defaultValue={initialValues?.dur ? Math.floor(initialValues.dur / 3600) : ''} disabled={loading} style={{ width: '100%' }} />
            <input name="dur_m" type="number" min="0" max="59" className="prompt-input" placeholder="Mins" defaultValue={initialValues?.dur ? Math.floor((initialValues.dur % 3600) / 60) : ''} disabled={loading} style={{ width: '100%' }} />
            <input name="dur_s" type="number" min="0" max="59" className="prompt-input" placeholder="Secs" defaultValue={initialValues?.dur ? initialValues.dur % 60 : ''} disabled={loading} style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Admin specific metadata fields */}
      {mode === 'admin' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
            <div className="form-group">
              <label className="admin-label">Course Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {createLogoUrl && (
                  <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#ffffff', border: '1px solid var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <img src={createLogoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <div style={{ position: 'relative', flex: 1 }}>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={loading || uploadingCreateLogo} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} />
                  <button type="button" className="prompt-input" style={{ width: '100%', textAlign: 'left', background: 'var(--surface-2)', color: 'var(--text-2)', pointerEvents: 'none' }}>
                    {uploadingCreateLogo ? 'Uploading...' : createLogoUrl ? 'Change Image' : 'Choose Image'}
                  </button>
                </div>
              </div>
              <input type="hidden" name="logo" value={createLogoUrl} />
            </div>
            <div className="form-group">
              <label className="admin-label">Emoji</label>
              <input name="emoji" type="text" className="prompt-input" placeholder="🎓" defaultValue={initialValues?.emoji} disabled={loading} />
            </div>
            <div className="form-group">
              <label className="admin-label">Gradient Class</label>
              <select name="g" className="prompt-input" defaultValue={initialValues?.g || 't-blue'} disabled={loading}>
                <option value="t-blue">Blue</option>
                <option value="t-red">Red</option>
                <option value="t-amber">Amber</option>
                <option value="t-teal">Teal</option>
                <option value="t-green">Green</option>
                <option value="t-purple">Purple</option>
                <option value="t-pink">Pink</option>
                <option value="t-slate">Slate</option>
              </select>
            </div>
            <div className="form-group">
              <label className="admin-label">Badge (optional)</label>
              <input name="tag" type="text" className="prompt-input" placeholder="e.g. hot" defaultValue={initialValues?.tag} disabled={loading} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <div className="form-group">
              <label className="admin-label">Badge Label (optional)</label>
              <input name="tag_label" type="text" className="prompt-input" placeholder="e.g. Best Seller" defaultValue={initialValues?.tag_label} disabled={loading} />
            </div>
            <div className="form-group">
              <label className="admin-label">Certificate Template</label>
              <select name="certificate_type" className="prompt-input" required defaultValue={initialValues?.certificate_type || 'default'} disabled={loading}>
                <option value="default">Default Template</option>
                <option value="tech_mastery">Tech Mastery (Premium)</option>
                <option value="creative_expert">Creative Expert</option>
                <option value="business_pro">Business Pro</option>
                <option value="completion_standard">Standard Completion</option>
              </select>
            </div>
          </div>
          
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="admin-label">Course Details / "What's included"</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
              {createDetails.map((detail, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                    className="prompt-input"
                    value={detail}
                    onChange={(e) => {
                      const newDetails = [...createDetails];
                      newDetails[idx] = e.target.value;
                      setCreateDetails(newDetails);
                    }}
                    placeholder="e.g. Lifetime access to recordings"
                    disabled={loading}
                    maxLength={250}
                    style={{ minHeight: '60px', resize: 'vertical' }}
                  />
                  <button type="button" className="admin-btn" style={{ padding: '0 16px', background: 'var(--surface-2)', border: '1px solid var(--border)' }} onClick={() => setCreateDetails(createDetails.filter((_, i) => i !== idx))} disabled={loading}>✕</button>
                </div>
              ))}
              {createDetails.length < 8 && (
                <button type="button" className="admin-btn" style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px', background: 'transparent', color: 'var(--indigo)', border: '1px dashed var(--indigo)' }} onClick={() => setCreateDetails([...createDetails, ''])} disabled={loading}>+ Add Detail</button>
              )}
            </div>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="admin-label">What you'll learn (optional legacy textarea)</label>
            <textarea name="what_you_will_learn" className="prompt-input" placeholder="e.g. Master the intersection of financial markets..." defaultValue={initialValues?.what_you_will_learn} style={{ minHeight: '100px', resize: 'vertical' }} disabled={loading}></textarea>
          </div>
        </>
      )}

      {/* Shared Descriptions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: mode === 'admin' ? '24px' : '20px', marginTop: mode === 'admin' ? '0' : '12px' }}>
        <div className={mode === 'admin' ? "form-group" : ""} style={mode === 'instructor' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : {}}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Short Description (Max 250 chars)</label>
          <textarea name="short_description" maxLength={250} className="prompt-input" placeholder="A brief summary of the course..." defaultValue={initialValues?.short_description} disabled={loading} style={{ width: '100%', minHeight: '60px', resize: 'vertical' }} />
        </div>

        <div className={mode === 'admin' ? "form-group" : ""} style={mode === 'instructor' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : {}}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Full Description</label>
          <LazyRichTextEditor disabled={loading} value={description} onChange={setDescription} />
        </div>
      </div>

      {/* Shared File Uploads */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: mode === 'admin' ? '24px' : '20px', marginTop: mode === 'admin' ? '0' : '12px' }}>
        <div className={mode === 'admin' ? "form-group" : ""} style={mode === 'instructor' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : {}}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Course Thumbnail</label>
          <input type="file" accept="image/*" className="prompt-input" disabled={loading} onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} style={{ width: '100%' }} />
          {thumbnailFile ? (
            <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-md)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'center' }}>
              <img src={URL.createObjectURL(thumbnailFile)} alt="Thumbnail Preview" style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          ) : initialValues?.thumbnail ? (
            <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-md)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'center' }}>
              <img src={initialValues.thumbnail} alt="Current Thumbnail" style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          ) : null}
        </div>

        <div className={mode === 'admin' ? "form-group" : ""} style={mode === 'instructor' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : {}}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Preview Video (or YouTube URL)</label>
          <input type="file" accept="video/*" className="prompt-input" disabled={loading} onChange={(e) => setPreviewVideoFile(e.target.files?.[0] || null)} style={{ width: '100%', marginBottom: '8px' }} />
          <input name="preview_video_url" type="text" className="prompt-input" placeholder="Or enter YouTube URL" defaultValue={initialValues?.preview_video?.includes('youtube') || initialValues?.preview_video?.includes('youtu.be') ? initialValues.preview_video : ''} disabled={loading || !!previewVideoFile} style={{ width: '100%' }} />
          {!previewVideoFile && initialValues?.preview_video && !initialValues.preview_video.includes('youtube') && !initialValues.preview_video.includes('youtu.be') && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-2)' }}>Current video uploaded. Uploading a new one will replace it.</div>
          )}
        </div>
      </div>

      {/* Shared Dynamic Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: mode === 'admin' ? '0' : '12px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>What You'll Learn</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
            <input type="text" value={lpInput} onChange={e => setLpInput(e.target.value)} className="prompt-input" placeholder="e.g. Master React fundamentals" style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArrayItem(setLearningPoints, lpInput, setLpInput); } }} />
            <button type="button" onClick={() => addArrayItem(setLearningPoints, lpInput, setLpInput)} className={mode === 'admin' ? "admin-btn primary" : "enrol-cta coral"} style={{ padding: '0 24px', width: 'auto', marginTop: 0 }}>Add</button>
          </div>
          {learningPoints.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: 'var(--ink)', fontSize: '14px' }}>
              {learningPoints.map((item, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{item} <button type="button" onClick={() => removeArrayItem(setLearningPoints, i)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px' }}>✕</button></li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
          <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Requirements</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
            <input type="text" value={reqInput} onChange={e => setReqInput(e.target.value)} className="prompt-input" placeholder="e.g. Basic understanding of HTML" style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArrayItem(setRequirements, reqInput, setReqInput); } }} />
            <button type="button" onClick={() => addArrayItem(setRequirements, reqInput, setReqInput)} className={mode === 'admin' ? "admin-btn primary" : "enrol-cta coral"} style={{ padding: '0 24px', width: 'auto', marginTop: 0 }}>Add</button>
          </div>
          {requirements.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: 'var(--ink)', fontSize: '14px' }}>
              {requirements.map((item, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{item} <button type="button" onClick={() => removeArrayItem(setRequirements, i)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px' }}>✕</button></li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
            <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Target Audience</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input type="text" value={taInput} onChange={e => setTaInput(e.target.value)} className="prompt-input" placeholder="e.g. Beginners" style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArrayItem(setTargetAudience, taInput, setTaInput); } }} />
              <button type="button" onClick={() => addArrayItem(setTargetAudience, taInput, setTaInput)} className={mode === 'admin' ? "admin-btn primary" : "enrol-cta coral"} style={{ padding: '0 24px', width: 'auto', marginTop: 0 }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {targetAudience.map((item, i) => (
                <span key={i} style={{ background: 'var(--surface-3)', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item} <button type="button" onClick={() => removeArrayItem(setTargetAudience, i)} style={{ color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
            <label className={mode === 'admin' ? "admin-label" : ""} style={mode === 'instructor' ? { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' } : {}}>Tags</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} className="prompt-input" placeholder="e.g. React" style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArrayItem(setTagsArray, tagInput, setTagInput); } }} />
              <button type="button" onClick={() => addArrayItem(setTagsArray, tagInput, setTagInput)} className={mode === 'admin' ? "admin-btn primary" : "enrol-cta coral"} style={{ padding: '0 24px', width: 'auto', marginTop: 0 }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {tagsArray.map((item, i) => (
                <span key={i} style={{ background: 'var(--surface-3)', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item} <button type="button" onClick={() => removeArrayItem(setTagsArray, i)} style={{ color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instructor specific fields (or shared now if admin also needs them?) The user requested unifying these. */}
      {mode === 'instructor' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Difficulty</label>
            <select name="difficulty" className="prompt-input" disabled={loading} defaultValue={initialValues?.difficulty || ''} style={{ width: '100%', height: '46px' }}>
              <option value="">Select Difficulty</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Language</label>
            <select name="language" className="prompt-input" disabled={loading} defaultValue={initialValues?.language || ''} style={{ width: '100%', height: '46px' }}>
              <option value="">Select Language</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Telugu">Telugu</option>
              <option value="Spanish">Spanish</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Estimated Completion</label>
            <input name="estimated_completion" type="text" className="prompt-input" placeholder="e.g. 10 Hours" defaultValue={initialValues?.estimated_completion} disabled={loading} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Certificate Provided</label>
            <div style={{ display: 'flex', alignItems: 'center', height: '46px', paddingLeft: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" name="certificate_enabled" defaultChecked={initialValues?.certificate_enabled} style={{ width: '20px', height: '20px', cursor: 'pointer' }} disabled={loading} />
                <span style={{ fontSize: '14px', color: 'var(--ink)' }}>Yes</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {mode === 'admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          <div className="form-group">
            <label className="admin-label">Language</label>
            <select name="language" className="prompt-input" defaultValue={initialValues?.language || ''} disabled={loading}>
              <option value="">Select Language</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Telugu">Telugu</option>
              <option value="Spanish">Spanish</option>
            </select>
          </div>
          <div className="form-group">
            <label className="admin-label">Estimated Completion</label>
            <input name="estimated_completion" type="text" className="prompt-input" placeholder="e.g. 10 Hours" defaultValue={initialValues?.estimated_completion} disabled={loading} />
          </div>
          <div className="form-group">
            <label className="admin-label">Certificate Provided</label>
            <div style={{ display: 'flex', alignItems: 'center', height: '46px', paddingLeft: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" name="certificate_enabled" defaultChecked={initialValues?.certificate_enabled} style={{ width: '20px', height: '20px', cursor: 'pointer' }} disabled={loading} />
                <span style={{ fontSize: '14px', color: 'var(--ink)' }}>Yes</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <button type="submit" className={mode === 'admin' ? "enrol-cta coral" : "enrol-cta coral"} disabled={loading || !!uploadStatus} style={mode === 'admin' ? { width: 'auto', justifySelf: 'start', padding: '14px 60px', marginTop: '12px' } : { marginTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {uploadStatus ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="btn-loader" style={{ borderTopColor: '#fff', width: '18px', height: '18px', borderWidth: '2px' }}></div>
            <span>{uploadStatus}</span>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="btn-loader" style={{ borderTopColor: '#fff', width: '18px', height: '18px', borderWidth: '2px' }}></div>
            <span>Processing...</span>
          </div>
        ) : btnText}
      </button>
    </form>
    <ActionModal config={modal} onClose={hideModal} />
    </>
  );
}
