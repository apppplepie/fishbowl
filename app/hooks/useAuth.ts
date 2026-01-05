/**
 * 认证 Hook - 向后兼容导出
 * 
 * 现在使用基于 Context 的全局认证状态，避免多个组件重复请求
 * 所有组件应该从 AuthContext 获取认证状态，确保整个应用只有一个实例
 * 
 * @deprecated 直接从 '@/app/contexts/AuthContext' 导入更清晰
 */
export { useAuth } from '../contexts/AuthContext';

