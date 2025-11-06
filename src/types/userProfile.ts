// src/types/userProfile.ts

// 用户资料接口
export interface UserProfile {
  accountName: string;
  followingCount: string;
  fansCount: string;
  likesAndCollects: string;
  xhsAccountId: string;
  description: string;
  accountStatus: string; // 从图片alt属性获取
}



// 序列化用户资料为可读字符串
export function serializeUserProfile(profile: UserProfile): string {
  const lines: string[] = [];
  lines.push(`👤 用户资料信息`);
  lines.push('='.repeat(40));
  lines.push(`   账户名称: ${profile.accountName}`);
  lines.push(`   账户状态: ${profile.accountStatus}`);
  lines.push(`   关注数量: ${profile.followingCount}`);
  lines.push(`   粉丝数量: ${profile.fansCount}`);
  lines.push(`   获赞与收藏: ${profile.likesAndCollects}`);
  lines.push(`   小红书ID: ${profile.xhsAccountId || '未获取到'}`);
  lines.push(`   个人描述: ${profile.description || '未获取到'}`);
  lines.push('='.repeat(40));
  return lines.join('\n');
}


export function validateUserProfile(profile: UserProfile): boolean {
  if (!profile.accountName || !profile.fansCount || !profile.followingCount) {
    return false;
  }
  return true;
}