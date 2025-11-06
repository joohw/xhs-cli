// MCP 工具定义 - 只包含实际已实现的工具


export function getTools() {
  return [
    {
      name: 'xhs_check_login',
      description: '检查小红书登录状态',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_get_overall_data',
      description: '获取小红书近期笔记运营数据（首页数据、账户统计、粉丝数据）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_get_recent_notes',
      description: '获取近期笔记统计数据（从笔记管理页面）',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '限制返回的笔记数量，默认为20',
            default: 20,
          },
        },
      },
    },
    {
      name: 'xhs_update_detailed_statistics',
      description: '更新缓存中的详细统计数据（从数据统计分析页面）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_get_note_detail_by_id',
      description: '根据笔记ID获取笔记详情（包括标题、内容、标签、图片等）',
      inputSchema: {
        type: 'object',
        properties: {
          noteId: {
            type: 'string',
            description: '笔记ID',
          },
        },
        required: ['noteId'],
      },
    },
    {
      name: 'xhs_read_posting_guidelines',
      description: '读取发帖指导原则并生成发帖计划建议',
      inputSchema: {
        type: 'object',
        properties: {
          generatePlan: {
            type: 'boolean',
            description: '是否生成下周发帖计划，默认为true',
            default: true,
          },
        },
      },
    },
    {
      name: 'xhs_login_status',
      description: '获取详细的登录状态信息（包括cookie状态、浏览器连接等）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_login',
      description: '登录小红书账号（会打开浏览器窗口进行登录）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}
