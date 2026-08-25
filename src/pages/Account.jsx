import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Camera, Check, Eye, EyeOff, KeyRound, Mail, Phone, Save, ShieldCheck, User, UserCircle2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import Input, { inputBaseClassName } from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import SaveChangesBar from '../components/account/SaveChangesBar';
import useAuthStore from '../store/useAuthStore';
import useAdminStore from '../store/useAdminStore';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/ui/Toast';
import { DEFAULT_HUMAN_AVATARS, resolveUserAvatar } from '../utils/avatar';
import { useBodyScrollLock } from '../utils/bodyScrollLock';
import { useNativeBackOverlay } from '../hooks/useNativeBackOverlay';
import { getReadableErrorMessage } from '../utils/errorMessages';

const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const AVATAR_PRESET_STORAGE_PREFIX = 'n-a-hub:selected-avatar:';

const getAvatarPresetStorageKey = (userId) => (
  userId ? `${AVATAR_PRESET_STORAGE_PREFIX}${String(userId)}` : ''
);

const getStoredPresetAvatar = (userId) => {
  if (typeof window === 'undefined') return '';
  const storageKey = getAvatarPresetStorageKey(userId);
  if (!storageKey) return '';

  const storedIndex = Number.parseInt(window.localStorage.getItem(storageKey) || '', 10);
  return Number.isInteger(storedIndex) ? (DEFAULT_HUMAN_AVATARS[storedIndex] || '') : '';
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9 ()-]{7,20}$/;
const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;

const getProfileFromUser = (user) => {
  const fullName = String(user?.name || '').trim();
  const username = String(user?.username || '').trim();
  const email = String(user?.email || '').trim().toLowerCase();
  const phone = String(user?.phone || '').trim();
  const avatar = String(user?.avatar || '').trim();

  return { fullName, username, email, phone, avatar };
};

const Account = () => {
  const location = useLocation();
  const fileInputRef = useRef(null);
  const passwordSectionRef = useRef(null);

  const { user, updateUserSession } = useAuthStore();
  const { updateUserProfile, updateUserAvatar } = useAdminStore();
  const { addToast } = useToast();
  const { language } = useLanguage();

  const isEnglish = language === 'en';
  const isArabic = !isEnglish;
  const text = useMemo(
    () =>
      isEnglish
        ? {
            pageTitle: 'My Account',
            pageSubtitle: 'View and manage your personal details and security preferences',
            activeAccount: 'Active account',
            changePhoto: 'Change image',
            removePhoto: 'Remove image',
            chooseAvatar: 'Choose a ready avatar',
            avatarGalleryHint: 'Pick a character and it will be saved automatically.',
            avatarOption: 'Avatar option',
            savingAvatar: 'Saving avatar...',
            avatarSaved: 'Avatar changed and saved successfully.',
            avatarSaveError: 'Could not save the selected avatar.',
            avatarCannotRemove: 'Avatar images cannot be removed. Choose another avatar instead.',
            imageHint: 'Supported: JPG, JPEG, PNG, WEBP (max 2MB)',
            personalInfo: 'Personal Info',
            fullName: 'Full name',
            username: 'Username (optional)',
            contactInfo: 'Contact Info',
            emailAddress: 'Email address',
            phoneNumber: 'Phone number',
            emailVerified: 'Email verified',
            emailNotVerified: 'Email not verified',
            email2faHint: 'Email is used for two-factor verification.',
            passwordCard: 'Change Password',
            currentPassword: 'Current password',
            newPassword: 'New password',
            confirmPassword: 'Confirm new password',
            passwordHint: 'Use at least 8 characters including uppercase, lowercase, and a number.',
            saveLabel: 'Save changes',
            cancelLabel: 'Cancel',
            dirtyHint: 'You have unsaved changes.',
            cleanHint: 'Everything is saved.',
            saveSuccess: 'Account changes saved successfully.',
            saveError: 'Could not save account changes.',
            unsavedAlert: 'You have pending edits. Save or cancel before leaving this page.',
            loading: 'Loading account data...',
            validationRequired: 'This field is required.',
            validationNameMin: 'Name must be at least 3 characters.',
            validationNameMax: 'Name must be no more than 60 characters.',
            validationUsername: 'Username must be 3-30 chars, letters/numbers/._- only.',
            validationEmail: 'Enter a valid email format.',
            validationPhone: 'Enter a valid phone number.',
            validationCurrentPassword: 'Current password is required to change password.',
            validationPasswordLength: 'New password must be at least 8 characters.',
            validationPasswordPattern: 'Password must include uppercase, lowercase, and a number.',
            validationPasswordMatch: 'Confirmation password does not match.',
            invalidImageType: 'Invalid image type. Use JPG, JPEG, PNG, or WEBP.',
            invalidImageSize: 'Image size must be 2MB or less.',
            securityTitle: 'Security',
            profileTitle: 'Profile'
          }
        : {
            pageTitle: 'حسابي',
            pageSubtitle: 'عرض وتعديل بياناتك الشخصية وإعدادات الأمان',
            activeAccount: 'حساب نشط',
            changePhoto: 'تغيير الصورة',
            removePhoto: 'إزالة الصورة',
            chooseAvatar: 'اختر أفاتار جاهز',
            avatarGalleryHint: 'اختر الشخصية التي تعجبك وسيتم حفظها تلقائيًا.',
            avatarOption: 'خيار الأفاتار',
            savingAvatar: 'جاري حفظ الأفاتار...',
            avatarSaved: 'تم تغيير الأفاتار وحفظه بنجاح.',
            avatarSaveError: 'تعذّر حفظ الأفاتار المختار.',
            avatarCannotRemove: 'لا يمكن حذف صورة الأفاتار. يمكنك اختيار أفاتار آخر بدلًا منها.',
            imageHint: 'الصيغ المدعومة: JPG, JPEG, PNG, WEBP (بحد أقصى 2MB)',
            personalInfo: 'البيانات الشخصية',
            fullName: 'الاسم الكامل',
            username: 'اسم العرض (اختياري)',
            contactInfo: 'بيانات التواصل',
            emailAddress: 'البريد الإلكتروني',
            phoneNumber: 'رقم الهاتف',
            emailVerified: 'البريد موثّق',
            emailNotVerified: 'البريد غير موثّق',
            email2faHint: 'يُستخدم البريد الإلكتروني للتحقق في المصادقة الثنائية.',
            passwordCard: 'تغيير كلمة المرور',
            currentPassword: 'كلمة المرور الحالية',
            newPassword: 'كلمة المرور الجديدة',
            confirmPassword: 'تأكيد كلمة المرور الجديدة',
            passwordHint: 'استخدم 8 أحرف على الأقل تتضمن حرفًا كبيرًا وصغيرًا ورقمًا.',
            saveLabel: 'حفظ التعديلات',
            cancelLabel: 'إلغاء',
            dirtyHint: 'لديك تغييرات غير محفوظة.',
            cleanHint: 'كل التعديلات محفوظة.',
            saveSuccess: 'تم حفظ تعديلات الحساب بنجاح.',
            saveError: 'تعذّر حفظ تعديلات الحساب.',
            unsavedAlert: 'لديك تعديلات معلّقة. احفظها أو ألغها قبل مغادرة الصفحة.',
            loading: 'جاري تحميل بيانات الحساب...',
            validationRequired: 'هذا الحقل مطلوب.',
            validationNameMin: 'الاسم يجب أن يكون 3 أحرف على الأقل.',
            validationNameMax: 'الاسم يجب ألا يتجاوز 60 حرفًا.',
            validationUsername: 'اسم العرض يجب أن يكون 3-30 حرفًا ويقبل الأحرف والأرقام و . _ - فقط.',
            validationEmail: 'أدخل بريدًا إلكترونيًا بصيغة صحيحة.',
            validationPhone: 'أدخل رقم هاتف بصيغة صحيحة.',
            validationCurrentPassword: 'كلمة المرور الحالية مطلوبة لتغيير كلمة المرور.',
            validationPasswordLength: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.',
            validationPasswordPattern: 'كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم.',
            validationPasswordMatch: 'تأكيد كلمة المرور غير مطابق.',
            invalidImageType: 'نوع الصورة غير صالح. استخدم JPG أو JPEG أو PNG أو WEBP.',
            invalidImageSize: 'حجم الصورة يجب ألا يتجاوز 2MB.',
            securityTitle: 'الأمان',
            profileTitle: 'الملف الشخصي'
          },
    [isEnglish]
  );

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [selectedPresetAvatar, setSelectedPresetAvatar] = useState('');
  const [saveState, setSaveState] = useState({ type: 'idle', message: '' });
  const [errors, setErrors] = useState({});
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [savedProfile, setSavedProfile] = useState(() => getProfileFromUser(user));
  const [form, setForm] = useState(() => ({
    ...getProfileFromUser(user),
    avatarPreview: String(user?.avatar || '').trim(),
    avatarFile: null,
    avatarAction: 'keep'
  }));
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [showPassword, setShowPassword] = useState({ current: false, next: false, confirm: false });

  useBodyScrollLock(isPasswordModalOpen);
  useNativeBackOverlay(isPasswordModalOpen, () => setIsPasswordModalOpen(false));

  useEffect(() => {
    const initialProfile = getProfileFromUser(user);
    setSavedProfile(initialProfile);
    setForm({
      ...initialProfile,
      avatarPreview: initialProfile.avatar,
      avatarFile: null,
      avatarAction: 'keep'
    });
    setPasswordForm({ current: '', next: '', confirm: '' });
    setErrors({});
    setSaveState({ type: 'idle', message: '' });
    setIsPasswordModalOpen(false);

    const timer = setTimeout(() => setIsInitialLoading(false), 350);
    return () => clearTimeout(timer);
  }, [user?.id, user?.name, user?.email, user?.avatar, user?.phone, user?.username]);

  useEffect(() => {
    setSelectedPresetAvatar(getStoredPresetAvatar(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!location.hash) return;
    const sectionMap = {
      '#password': passwordSectionRef.current
    };

    const target = sectionMap[location.hash];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (location.hash === '#password') setIsPasswordModalOpen(true);
    }
  }, [location.hash]);

  const avatarIdentity = form.fullName || savedProfile.fullName || form.username || savedProfile.username || form.email || savedProfile.email || 'N&A HUB User';
  const fallbackAvatar = resolveUserAvatar({ name: avatarIdentity, avatar: '' }, avatarIdentity);
  const displayedAvatar =
    form.avatarAction === 'remove'
      ? fallbackAvatar
      : resolveUserAvatar(form.avatarPreview || savedProfile.avatar, avatarIdentity);

  const hasAvatarChanges = form.avatarAction !== 'keep';
  const hasPersonalInfoChanges =
    form.fullName.trim() !== savedProfile.fullName ||
    form.username.trim() !== savedProfile.username;
  const hasProfileChanges =
    hasPersonalInfoChanges ||
    form.email.trim().toLowerCase() !== savedProfile.email ||
    form.phone.trim() !== savedProfile.phone ||
    hasAvatarChanges;
  const isDirty = hasProfileChanges;

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type.toLowerCase())) {
      setErrors((prev) => ({ ...prev, avatar: text.invalidImageType }));
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, avatar: text.invalidImageSize }));
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setSelectedPresetAvatar('');
    setForm((prev) => ({ ...prev, avatarPreview: nextPreview, avatarFile: file, avatarAction: 'update' }));
    setErrors((prev) => ({ ...prev, avatar: '' }));
  };

  const handleRemoveAvatar = () => {
    setErrors((prev) => ({ ...prev, avatar: text.avatarCannotRemove }));
    setSaveState({ type: 'error', message: text.avatarCannotRemove });
    addToast(text.avatarCannotRemove, 'error');
  };

  const handlePresetAvatarSelect = async (avatarUrl) => {
    if (!user?.id || isAvatarSaving || isSaving) return;

    const previousAvatar = String(user?.avatar || '').trim();
    const previousPresetAvatar = selectedPresetAvatar;

    setSelectedPresetAvatar(avatarUrl);
    setForm((prev) => ({
      ...prev,
      avatarPreview: avatarUrl,
      avatarFile: null,
      avatarAction: 'preset'
    }));
    setErrors((prev) => ({ ...prev, avatar: '' }));
    setIsAvatarSaving(true);
    setSaveState({ type: 'saving', message: '' });
    updateUserSession({ avatar: avatarUrl });

    try {
      const avatarResponse = await fetch(avatarUrl);
      if (!avatarResponse.ok) throw new Error(text.saveError);
      const avatarBlob = await avatarResponse.blob();
      const avatarIndex = DEFAULT_HUMAN_AVATARS.indexOf(avatarUrl) + 1;
      const avatarFile = new File(
        [avatarBlob],
        `n-a-hub-avatar-${avatarIndex}.webp`,
        { type: avatarBlob.type || 'image/webp' }
      );
      const updatedUser = await updateUserAvatar(user.id, avatarFile, user);
      const persistedAvatar = typeof updatedUser?.avatar === 'string' && updatedUser.avatar.trim()
        ? updatedUser.avatar
        : avatarUrl;

      updateUserSession({ avatar: persistedAvatar });
      const presetStorageKey = getAvatarPresetStorageKey(user.id);
      if (presetStorageKey) window.localStorage.setItem(presetStorageKey, String(avatarIndex - 1));
      setSavedProfile((prev) => ({ ...prev, avatar: persistedAvatar }));
      setForm((prev) => ({
        ...prev,
        avatar: persistedAvatar,
        avatarPreview: persistedAvatar,
        avatarFile: null,
        avatarAction: 'keep'
      }));
      setSaveState({ type: 'success', message: text.avatarSaved });
      addToast(text.avatarSaved, 'success');
    } catch (error) {
      updateUserSession({ avatar: previousAvatar });
      setSelectedPresetAvatar(previousPresetAvatar);
      setForm((prev) => ({
        ...prev,
        avatar: previousAvatar,
        avatarPreview: previousAvatar,
        avatarFile: null,
        avatarAction: 'keep'
      }));
      const message = getReadableErrorMessage(error, text.avatarSaveError, { language });
      setSaveState({ type: 'error', message });
      addToast(message, 'error');
    } finally {
      setIsAvatarSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      ...savedProfile,
      avatarPreview: savedProfile.avatar,
      avatarFile: null,
      avatarAction: 'keep'
    });
    setPasswordForm({ current: '', next: '', confirm: '' });
    setShowPassword({ current: false, next: false, confirm: false });
    setErrors({});
    setSelectedPresetAvatar(getStoredPresetAvatar(user?.id));
    setSaveState({ type: 'idle', message: '' });
    setIsPasswordModalOpen(false);
  };

  const validateForm = () => {
    const validationErrors = {};
    const fullName = form.fullName.trim();
    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (!fullName) validationErrors.fullName = text.validationRequired;
    else if (fullName.length < 3) validationErrors.fullName = text.validationNameMin;
    else if (fullName.length > 60) validationErrors.fullName = text.validationNameMax;

    if (username && !usernameRegex.test(username)) {
      validationErrors.username = text.validationUsername;
    }

    if (!email) validationErrors.email = text.validationRequired;
    else if (!emailRegex.test(email)) validationErrors.email = text.validationEmail;

    if (phone && !phoneRegex.test(phone)) validationErrors.phone = text.validationPhone;

    return validationErrors;
  };

  const validatePasswordForm = () => {
    const validationErrors = {};

    if (!passwordForm.current) validationErrors.currentPassword = text.validationCurrentPassword;
    if (!passwordForm.next) validationErrors.nextPassword = text.validationRequired;
    else if (passwordForm.next.length < 8) validationErrors.nextPassword = text.validationPasswordLength;
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.next)) {
      validationErrors.nextPassword = text.validationPasswordPattern;
    }

    if (passwordForm.confirm !== passwordForm.next) {
      validationErrors.confirmPassword = text.validationPasswordMatch;
    }

    return validationErrors;
  };

  const validatePersonalInfo = () => {
    const validationErrors = {};
    const fullName = form.fullName.trim();
    const username = form.username.trim();

    if (!fullName) validationErrors.fullName = text.validationRequired;
    else if (fullName.length < 3) validationErrors.fullName = text.validationNameMin;
    else if (fullName.length > 60) validationErrors.fullName = text.validationNameMax;

    if (username && !usernameRegex.test(username)) {
      validationErrors.username = text.validationUsername;
    }

    return validationErrors;
  };

  const handleSavePersonalInfo = async () => {
    if (!user?.id) return;

    const validationErrors = validatePersonalInfo();
    setErrors((prev) => ({
      ...prev,
      fullName: validationErrors.fullName || '',
      username: validationErrors.username || '',
    }));

    if (Object.keys(validationErrors).length > 0) {
      setSaveState({ type: 'error', message: text.saveError });
      addToast(text.saveError, 'error');
      return;
    }

    setIsSaving(true);
    setSaveState({ type: 'saving', message: '' });

    const trimmedProfile = {
      fullName: form.fullName.trim(),
      username: form.username.trim(),
    };

    try {
      const profilePayload = {
        name: trimmedProfile.fullName,
        username: trimmedProfile.username,
      };

      await updateUserProfile(user.id, profilePayload, user);

      updateUserSession({
        name: profilePayload.name,
        username: profilePayload.username,
      });

      setSavedProfile((prev) => ({
        ...prev,
        fullName: trimmedProfile.fullName,
        username: trimmedProfile.username,
      }));
      setForm((prev) => ({
        ...prev,
        fullName: trimmedProfile.fullName,
        username: trimmedProfile.username,
      }));
      setErrors((prev) => ({ ...prev, fullName: '', username: '' }));
      setSaveState({ type: 'success', message: text.saveSuccess });
      addToast(text.saveSuccess, 'success');
    } catch (error) {
      const message = getReadableErrorMessage(error, text.saveError, { language });
      setSaveState({ type: 'error', message });
      addToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSaveState({ type: 'error', message: text.saveError });
      addToast(text.saveError, 'error');
      return;
    }

    setIsSaving(true);
    setSaveState({ type: 'saving', message: '' });

    const trimmedProfile = {
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim()
    };

    try {
      const profilePayload = {
        name: trimmedProfile.fullName,
        email: trimmedProfile.email,
        username: trimmedProfile.username,
        phone: trimmedProfile.phone
      };

      if (hasAvatarChanges) {
        let avatarPayload = form.avatarFile;

        if (form.avatarAction === 'preset') {
          const avatarResponse = await fetch(form.avatarPreview);
          if (!avatarResponse.ok) throw new Error(text.saveError);
          const avatarBlob = await avatarResponse.blob();
          avatarPayload = new File(
            [avatarBlob],
            `n-a-hub-avatar-${DEFAULT_HUMAN_AVATARS.indexOf(form.avatarPreview) + 1}.webp`,
            { type: avatarBlob.type || 'image/webp' }
          );
        }

        await updateUserAvatar(user.id, avatarPayload, user);
      }

      await updateUserProfile(user.id, profilePayload, user);

      const nextAvatarValue = hasAvatarChanges
        ? form.avatarAction === 'remove'
          ? ''
          : form.avatarPreview
        : savedProfile.avatar;

      if (hasAvatarChanges && form.avatarAction !== 'preset') {
        const presetStorageKey = getAvatarPresetStorageKey(user.id);
        if (presetStorageKey) window.localStorage.removeItem(presetStorageKey);
        setSelectedPresetAvatar('');
      }

      updateUserSession({
        name: profilePayload.name,
        email: profilePayload.email,
        username: profilePayload.username,
        phone: profilePayload.phone,
        avatar: nextAvatarValue
      });

      const nextSaved = {
        fullName: trimmedProfile.fullName,
        username: trimmedProfile.username,
        email: trimmedProfile.email,
        phone: trimmedProfile.phone,
        avatar: nextAvatarValue
      };

      setSavedProfile(nextSaved);
      setForm({
        ...nextSaved,
        avatarPreview: nextSaved.avatar,
        avatarFile: null,
        avatarAction: 'keep'
      });
      setErrors({});
      setSaveState({ type: 'success', message: text.saveSuccess });
      addToast(text.saveSuccess, 'success');
    } catch (error) {
      const message = getReadableErrorMessage(error, text.saveError, { language });
      setSaveState({ type: 'error', message });
      addToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!user?.id) return;

    const validationErrors = validatePasswordForm();
    setErrors((prev) => ({
      ...prev,
      currentPassword: validationErrors.currentPassword || '',
      nextPassword: validationErrors.nextPassword || '',
      confirmPassword: validationErrors.confirmPassword || ''
    }));

    if (Object.keys(validationErrors).length > 0) {
      setSaveState({ type: 'error', message: text.saveError });
      addToast(text.saveError, 'error');
      return;
    }

    setIsSaving(true);
    setSaveState({ type: 'saving', message: '' });

    try {
      await updateUserProfile(
        user.id,
        {
          name: savedProfile.fullName,
          email: savedProfile.email,
          username: savedProfile.username,
          phone: savedProfile.phone,
          password: passwordForm.next
        },
        user
      );

      setPasswordForm({ current: '', next: '', confirm: '' });
      setShowPassword({ current: false, next: false, confirm: false });
      setIsPasswordModalOpen(false);
      setErrors((prev) => ({
        ...prev,
        currentPassword: '',
        nextPassword: '',
        confirmPassword: ''
      }));
      setSaveState({ type: 'success', message: text.saveSuccess });
      addToast(text.saveSuccess, 'success');
    } catch (error) {
      const message = getReadableErrorMessage(error, text.saveError, { language });
      setSaveState({ type: 'error', message });
      addToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (isInitialLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-14 animate-pulse rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.9)]" />
        <div className="h-52 animate-pulse rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.9)]" />
        <div className="h-64 animate-pulse rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.9)]" />
      </div>
    );
  }

  const emailVerified = Boolean(user?.emailVerified ?? true);

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-24">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.9)] p-5 shadow-[var(--shadow-subtle)] backdrop-blur-md"
      >
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{text.pageTitle}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{text.pageSubtitle}</p>
      </motion.header>

      {isDirty ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          {text.unsavedAlert}
        </div>
      ) : null}

      {saveState.message ? (
        <div
          className={`rounded-xl border p-3 text-sm ${
            saveState.type === 'success'
              ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : saveState.type === 'error'
                ? 'border-rose-400/25 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                : 'border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.88)] text-[var(--color-text-secondary)]'
          }`}
        >
          {saveState.message}
        </div>
      ) : null}

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden rounded-3xl border border-[color:rgb(var(--color-primary-rgb)/0.16)] bg-[linear-gradient(135deg,rgb(var(--color-card-rgb)/0.98),rgb(var(--color-primary-rgb)/0.08))] p-0 shadow-[0_24px_70px_-48px_rgb(var(--color-primary-rgb)/0.85)]">
          <div className="border-b border-[color:rgb(var(--color-border-rgb)/0.55)] bg-[color:rgb(var(--color-card-rgb)/0.55)] px-5 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-black text-[var(--color-text)]">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[color:rgb(var(--color-primary-rgb)/0.12)] text-[var(--color-primary)]">
                  <UserCircle2 className="h-[18px] w-[18px]" />
                </span>
                {text.profileTitle}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                {text.activeAccount}
              </span>
            </div>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
            <div className="relative mx-auto md:mx-0">
              <span className="absolute -inset-2 rounded-[2rem] bg-[conic-gradient(from_140deg,rgb(var(--color-primary-rgb)/0.18),rgb(192_38_211/0.26),rgb(var(--color-primary-rgb)/0.12))] blur-[2px]" />
              <img
                src={displayedAvatar}
                alt={form.fullName || text.pageTitle}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = fallbackAvatar;
                }}
                className="relative h-[5.25rem] w-[5.25rem] rounded-[1.5rem] border-2 border-white/85 object-cover shadow-[0_18px_42px_-24px_rgba(2,6,23,0.75)] dark:border-white/10"
              />
              <span
                className="absolute -bottom-1 -right-1 z-10 h-5 w-5 rounded-full border-[3px] border-[color:rgb(var(--color-card-rgb)/0.98)] bg-emerald-400 shadow-[0_0_0_4px_rgb(16_185_129/0.14),0_0_18px_rgb(16_185_129/0.72)]"
                role="status"
                aria-label={isArabic ? 'متصل الآن' : 'Online now'}
                title={isArabic ? 'متصل الآن' : 'Online now'}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -left-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/80 bg-[var(--color-primary)] text-[var(--color-button-text)] shadow-lg transition hover:brightness-105 dark:border-white/10"
                aria-label={text.changePhoto}
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="min-w-0 text-center md:text-start">
              <p className="truncate text-xl font-black text-[var(--color-text)]">{form.fullName || '---'}</p>
              <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-card-rgb)/0.7)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                <span className="truncate">{form.email || '---'}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--color-muted)]">{text.imageHint}</p>
              {errors.avatar ? <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">{errors.avatar}</p> : null}
            </div>

            <div className="flex justify-center gap-2 md:flex-col">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[color:rgb(var(--color-primary-rgb)/0.26)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-4 text-xs font-black text-[var(--color-primary)] transition hover:bg-[color:rgb(var(--color-primary-rgb)/0.16)]"
              >
                <Camera className="h-4 w-4" />
                {text.changePhoto}
              </button>
              {(form.avatarPreview || savedProfile.avatar) ? (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/8 px-4 text-xs font-black text-rose-600 transition hover:bg-rose-500/12 dark:text-rose-300"
                >
                  <X className="h-4 w-4" />
                  {text.removePhoto}
                </button>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[color:rgb(var(--color-border-rgb)/0.55)] px-5 pb-5 pt-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-[var(--color-text)]">{text.chooseAvatar}</h3>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{text.avatarGalleryHint}</p>
              </div>
              <span className="rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-2.5 py-1 text-[0.65rem] font-black text-[var(--color-primary)]">
                {isAvatarSaving
                  ? text.savingAvatar
                  : `${DEFAULT_HUMAN_AVATARS.length} ${isArabic ? 'شخصيات' : 'characters'}`}
              </span>
            </div>

            <div className="grid max-w-[18rem] grid-cols-4 gap-2 sm:max-w-[20rem] sm:gap-2.5">
              {DEFAULT_HUMAN_AVATARS.map((avatarUrl, index) => {
                const isSelected = selectedPresetAvatar
                  ? selectedPresetAvatar === avatarUrl
                  : displayedAvatar === avatarUrl;

                return (
                  <button
                    key={avatarUrl}
                    type="button"
                    onClick={() => handlePresetAvatarSelect(avatarUrl)}
                    disabled={isSaving || isAvatarSaving}
                    aria-label={`${text.avatarOption} ${index + 1}`}
                    aria-pressed={isSelected}
                    className={`group relative aspect-square overflow-hidden rounded-[1rem] border-2 bg-[color:rgb(var(--color-card-rgb)/0.8)] p-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-card-rgb))] disabled:cursor-wait disabled:opacity-75 ${
                      isSelected
                        ? 'scale-[1.035] border-[var(--color-primary)] shadow-[0_12px_30px_-14px_rgb(var(--color-primary-rgb)/0.9),0_0_0_3px_rgb(var(--color-primary-rgb)/0.1)]'
                        : 'border-[color:rgb(var(--color-border-rgb)/0.72)] hover:-translate-y-0.5 hover:border-[color:rgb(var(--color-primary-rgb)/0.55)]'
                    }`}
                  >
                    <img
                      src={avatarUrl}
                      alt={`${text.avatarOption} ${index + 1}`}
                      className="h-full w-full rounded-[0.78rem] object-cover transition duration-200 group-hover:scale-[1.03]"
                    />
                    {isSelected ? (
                      <span className="absolute end-1 top-1 inline-grid h-7 w-7 rotate-[-4deg] place-items-center rounded-[0.72rem] border border-white/80 bg-[linear-gradient(145deg,#22d3ee_0%,#2563eb_48%,#a855f7_100%)] text-white shadow-[0_8px_20px_-8px_rgb(37_99_235/0.95),0_0_14px_rgb(168_85_247/0.68),inset_0_1px_rgb(255_255_255/0.5)]">
                        <span className="grid h-[1.12rem] w-[1.12rem] place-items-center rounded-md bg-white/18">
                          <Check className="h-4 w-4 stroke-[3.2]" />
                        </span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.9)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
            <User className="h-[18px] w-[18px] text-[var(--color-primary)]" />
            {text.personalInfo}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={text.fullName}
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              error={errors.fullName}
              placeholder={isEnglish ? 'Enter full name' : 'أدخل الاسم الكامل'}
            />
            <Input
              label={text.username}
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              error={errors.username}
              placeholder={isEnglish ? 'Optional username' : 'اسم عرض اختياري'}
            />
          </div>
        </Card>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleSavePersonalInfo}
            disabled={isSaving || isAvatarSaving || !hasPersonalInfoChanges}
            className="inline-flex h-10 min-w-[8.5rem] items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-button-text)] shadow-[0_10px_24px_-12px_rgb(var(--color-primary-rgb)/0.9)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (isEnglish ? 'Saving...' : 'جاري الحفظ...') : text.saveLabel}
          </button>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.9)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
              <Mail className="h-[18px] w-[18px] text-[var(--color-primary)]" />
              {text.contactInfo}
            </h2>
            <Badge variant={emailVerified ? 'success' : 'warning'}>
              {emailVerified ? text.emailVerified : text.emailNotVerified}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={text.emailAddress}
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              error={errors.email}
              placeholder={isEnglish ? 'name@example.com' : 'name@example.com'}
            />
            <Input
              label={text.phoneNumber}
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              error={errors.phone}
              placeholder={isEnglish ? '+1 555 123 4567' : '+20 100 123 4567'}
            />
          </div>
          <p className="mt-3 text-xs text-[var(--color-muted)]">{text.email2faHint}</p>
        </Card>
      </motion.section>

      <motion.section ref={passwordSectionRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.9)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
                <KeyRound className="h-[18px] w-[18px] text-[var(--color-primary)]" />
                {text.passwordCard}
              </h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{text.passwordHint}</p>
            </div>

            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.32)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-4 text-sm font-bold text-[var(--color-primary)] transition hover:border-[color:rgb(var(--color-primary-rgb)/0.5)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.16)]"
            >
              <KeyRound className="h-4 w-4" />
              {text.passwordCard}
            </button>
          </div>
        </Card>
      </motion.section>

      {typeof document !== 'undefined' && createPortal(
        isPasswordModalOpen ? (
        <div className="fixed inset-0 z-[280] flex h-[100dvh] max-h-[100dvh] items-center justify-center overflow-hidden bg-black/55 px-3 py-4 backdrop-blur-sm sm:py-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.98)] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.75)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="change-password-title" className="flex items-center gap-2 text-lg font-black text-[var(--color-text)]">
                  <KeyRound className="h-5 w-5 text-[var(--color-primary)]" />
                  {text.passwordCard}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">{text.passwordHint}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:rgb(var(--color-border-rgb)/0.9)] text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
                aria-label={text.cancelLabel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { key: 'current', label: text.currentPassword, error: errors.currentPassword },
                { key: 'next', label: text.newPassword, error: errors.nextPassword },
                { key: 'confirm', label: text.confirmPassword, error: errors.confirmPassword }
              ].map((item) => (
                <div key={item.key}>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">{item.label}</label>
                  <div className="relative">
                    <input
                      type={showPassword[item.key] ? 'text' : 'password'}
                      value={passwordForm[item.key]}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, [item.key]: event.target.value }))}
                      className={`${inputBaseClassName} pl-10 ${
                        item.error
                          ? 'border-[color:rgb(var(--color-error-rgb)/0.85)] focus:border-[color:rgb(var(--color-error-rgb)/0.8)] focus:ring-[color:rgb(var(--color-error-rgb)/0.16)]'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key]
                        }))
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-text)]"
                    >
                      {showPassword[item.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {item.error ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{item.error}</p> : null}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPasswordForm({ current: '', next: '', confirm: '' });
                  setShowPassword({ current: false, next: false, confirm: false });
                  setErrors((prev) => ({
                    ...prev,
                    currentPassword: '',
                    nextPassword: '',
                    confirmPassword: '',
                  }));
                  setIsPasswordModalOpen(false);
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.9)] px-4 text-sm font-bold text-[var(--color-text-secondary)] transition hover:text-[var(--color-text)]"
              >
                {text.cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleSavePassword}
                disabled={isSaving || isAvatarSaving}
                className="inline-flex h-10 min-w-[8rem] items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-button-text)] shadow-[0_10px_24px_-12px_rgb(var(--color-primary-rgb)/0.9)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (isEnglish ? 'Saving...' : 'جاري الحفظ...') : text.saveLabel}
              </button>
            </div>
          </motion.div>
        </div>
        ) : null,
        document.body
      )}

      <SaveChangesBar
        isDirty={isDirty}
        isSaving={isSaving || isAvatarSaving}
        onSave={handleSave}
        onCancel={handleCancel}
        saveLabel={text.saveLabel}
        cancelLabel={text.cancelLabel}
        dirtyHint={text.dirtyHint}
        cleanHint={text.cleanHint}
      />

      <div className="h-3" />
      <div className="hidden items-center gap-2 text-xs text-gray-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        <Mail className="h-3.5 w-3.5" />
        <Phone className="h-3.5 w-3.5" />
        <Save className="h-3.5 w-3.5" />
      </div>
    </div>
  );
};

export default Account;
