'use client';

import React, { useState, useEffect, useRef } from 'react';
import { theme } from '@/app/config/theme';
import { Key, User, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { message, Input } from '@/app/components/ui';
import '@/app/styles/profile.css';

export const SecurityContent: React.FC = () => {
  const { logout, user, refreshUser } = useAuth();
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayNameValue, setDisplayNameValue] = useState(user?.display_name || user?.username || '');
  const [passwordValues, setPasswordValues] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const passwordEditRef = useRef<HTMLDivElement>(null);
  const displayNameSavingRef = useRef(false);

  // 当用户信息更新时，同步更新显示名
  useEffect(() => {
    if (user && !displayNameSavingRef.current) {
      setDisplayNameValue(user.display_name || user.username || '');
    }
  }, [user]);

  // 点击框外自动取消密码编辑
  useEffect(() => {
    if (!isEditingPassword) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (passwordEditRef.current && !passwordEditRef.current.contains(event.target as Node)) {
        setIsEditingPassword(false);
        setPasswordValues({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingPassword]);

  const handleLogout = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      await logout();
    }
  };

  const getCurrentDisplayName = () => user?.display_name || user?.username || '';

  // 失焦时：与当前值比对，有变化再自动保存
  const handleDisplayNameBlur = async () => {
    const next = displayNameValue.trim();
    const prev = getCurrentDisplayName();

    if (next === prev) {
      setDisplayNameValue(prev);
      return;
    }
    if (!next) {
      message.error('显示名不能为空');
      setDisplayNameValue(prev);
      return;
    }
    if (next.length > 15) {
      message.error('显示名长度不能超过15个字符');
      setDisplayNameValue(prev);
      return;
    }
    if (displayNameSavingRef.current) return;

    displayNameSavingRef.current = true;
    setLoading(true);
    try {
      const response = await fetch('/api/auth/update-display-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName: next }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        message.success('显示名更新成功！');
        setDisplayNameValue(next);
        await refreshUser();
      } else {
        message.error(data.error || '更新失败');
        setDisplayNameValue(prev);
      }
    } catch (error) {
      console.error('更新显示名失败:', error);
      message.error('更新失败，请稍后重试');
      setDisplayNameValue(prev);
    } finally {
      setLoading(false);
      displayNameSavingRef.current = false;
    }
  };

  // 验证密码字段
  const validatePasswordField = (name: string, value: string, allValues: typeof passwordValues) => {
    const errors = { ...passwordErrors };
    
    if (name === 'oldPassword') {
      if (!value) {
        errors.oldPassword = '请输入当前密码';
      } else {
        errors.oldPassword = '';
      }
    } else if (name === 'newPassword') {
      if (!value) {
        errors.newPassword = '请输入新密码';
      } else if (value.length < 6) {
        errors.newPassword = '密码长度至少为6个字符';
      } else if (value.length > 100) {
        errors.newPassword = '密码长度不能超过100个字符';
      } else {
        errors.newPassword = '';
      }
      // 如果确认密码已输入，重新验证确认密码
      if (allValues.confirmPassword) {
        if (allValues.confirmPassword !== value) {
          errors.confirmPassword = '两次输入的新密码不一致';
        } else {
          errors.confirmPassword = '';
        }
      }
    } else if (name === 'confirmPassword') {
      if (!value) {
        errors.confirmPassword = '请再次输入新密码';
      } else if (value !== allValues.newPassword) {
        errors.confirmPassword = '两次输入的新密码不一致';
      } else {
        errors.confirmPassword = '';
      }
    }
    
    setPasswordErrors(errors);
  };

  // 处理密码输入变化
  const handlePasswordChange = (name: string, value: string) => {
    const newValues = { ...passwordValues, [name]: value };
    setPasswordValues(newValues);
    validatePasswordField(name, value, newValues);
  };

  // 处理修改密码
  const handleChangePassword = async () => {
    // 验证所有字段
    const errors = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    if (!passwordValues.oldPassword) {
      errors.oldPassword = '请输入当前密码';
    }
    if (!passwordValues.newPassword) {
      errors.newPassword = '请输入新密码';
    } else if (passwordValues.newPassword.length < 6) {
      errors.newPassword = '密码长度至少为6个字符';
    } else if (passwordValues.newPassword.length > 100) {
      errors.newPassword = '密码长度不能超过100个字符';
    }
    if (!passwordValues.confirmPassword) {
      errors.confirmPassword = '请再次输入新密码';
    } else if (passwordValues.confirmPassword !== passwordValues.newPassword) {
      errors.confirmPassword = '两次输入的新密码不一致';
    }

    setPasswordErrors(errors);

    // 如果有错误，不提交
    if (errors.oldPassword || errors.newPassword || errors.confirmPassword) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          oldPassword: passwordValues.oldPassword,
          newPassword: passwordValues.newPassword,
          confirmPassword: passwordValues.confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        message.success('密码修改成功！请重新登录');
        setIsEditingPassword(false);
        setPasswordValues({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({ oldPassword: '', newPassword: '', confirmPassword: '' });
        // 延迟一下再登出，让用户看到成功消息
        setTimeout(async () => {
          await logout();
        }, 1000);
      } else {
        message.error(data.error || '修改失败');
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      message.error('修改失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPassword = () => {
    setIsEditingPassword(false);
    setPasswordValues({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({ oldPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="space-y-3 pt-4 h-full flex flex-col">
      {/* 修改显示名 */}
      <div
        className="w-full p-4 rounded-2xl"
        style={{
          backgroundColor: theme.background.whiteOverlayLight,
          border: `1px solid ${'var(--profile-border, #e6e6e6)'}`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <User size={18} style={{ color: 'var(--profile-fg, #000000)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--profile-fg, #000000)' }}>显示名</span>
        </div>
        <Input
          value={displayNameValue}
          onChange={(e) => setDisplayNameValue(e.target.value)}
          onBlur={handleDisplayNameBlur}
          onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
          placeholder="请输入显示名"
          maxLength={15}
          className="security-inline-input"
          disabled={loading}
          size="middle"
        />
      </div>

      {/* 修改密码 */}
      <div
        className="w-full rounded-2xl"
        style={{
          backgroundColor: theme.background.whiteOverlayLight,
          border: `1px solid ${'var(--profile-border, #e6e6e6)'}`,
        }}
      >
        {!isEditingPassword ? (
          <button
            onClick={() => setIsEditingPassword(true)}
            className="w-full p-4 flex items-center justify-between transition-colors group hover:opacity-90"
          >
            <div className="flex items-center gap-3">
              <Key size={18} style={{ color: 'var(--profile-fg, #000000)' }} className="group-hover:opacity-80" />
              <div className="text-left">
                <span className="block text-sm font-medium" style={{ color: 'var(--profile-fg, #000000)' }}>密码</span>
                <span className="block text-[10px] uppercase tracking-wide" style={{ color: 'var(--profile-fg, #000000)' }}>点击修改密码</span>
              </div>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--profile-fg, #000000)' }} />
          </button>
        ) : (
          <div className="p-4" ref={passwordEditRef}>
            <div className="flex items-center gap-3 mb-4">
              <Key size={18} style={{ color: 'var(--profile-fg, #000000)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--profile-fg, #000000)' }}>修改密码</span>
            </div>
            <div className="security-inline-form">
              <div className="security-inline-form-item">
                <Input.Password
                  value={passwordValues.oldPassword}
                  onChange={(e) => handlePasswordChange('oldPassword', e.target.value)}
                  placeholder="当前密码"
                  className="security-inline-input"
                  autoFocus
                  size="middle"
                />
                {passwordErrors.oldPassword && (
                  <div className="security-inline-error">{passwordErrors.oldPassword}</div>
                )}
              </div>
              <div className="security-inline-form-item">
                <Input.Password
                  value={passwordValues.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  placeholder="新密码"
                  className="security-inline-input"
                  size="middle"
                />
                {passwordErrors.newPassword && (
                  <div className="security-inline-error">{passwordErrors.newPassword}</div>
                )}
              </div>
              <div className="security-inline-form-item">
                <Input.Password
                  value={passwordValues.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  placeholder="确认新密码"
                  className="security-inline-input"
                  size="middle"
                />
                {passwordErrors.confirmPassword && (
                  <div className="security-inline-error">{passwordErrors.confirmPassword}</div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  className="security-inline-button security-inline-button-submit"
                  disabled={loading}
                >
                  {loading ? '修改中...' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPassword}
                  className="security-inline-button security-inline-button-cancel"
                  disabled={loading}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 退出登录按钮 */}
      <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--profile-border, #e6e6e6)' }}>
        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-2xl flex items-center justify-center gap-3 transition-colors group hover:opacity-90"
          style={{
            backgroundColor: theme.background.whiteOverlayLight,
            border: `1px solid ${theme.colors.error}40`,
          }}
        >
          <LogOut size={18} style={{ color: theme.colors.error }} className="group-hover:opacity-80 profile-error-button" />
          <span className="text-sm font-medium profile-error-button" style={{ color: theme.colors.error }}>退出登录</span>
        </button>
      </div>
    </div>
  );
};

