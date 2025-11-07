// MCP 工具定义 - 只包含实际已实现的工具


export function getTools() {
  return [
    {
      name: 'xhs_login',
      description: '登录小红书账号（会打开浏览器窗口进行登录）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_check_login',
      description: '检查小红书登录状态（返回简单的登录状态信息）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_get_operation_data',
      description: '获取小红书近期笔记运营数据（首页数据、账户统计、粉丝数据）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_get_recent_notes',
      description: '获取近期发布的笔记列表',
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
      name: 'xhs_get_note_detail',
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
      description: '读取发帖指导原则并生成发帖计划建议。注意：要添加待发布的笔记，请使用 xhs_create_or_update_post 工具，传入标题和内容等参数。标题将作为唯一键，如果已存在相同标题的笔记则会更新。',
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
      name: 'xhs_get_my_profile',
      description: '获取当前登录用户的资料信息（包括账户名、粉丝数、关注数、获赞与收藏等）',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_list_queue_posts',
      description: '获取待发布的笔记列表',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'xhs_get_queue_post_detail',
      description: '根据文件名获取待发布笔记的详情（包括标题、内容、图片、标签等）',
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: '待发布笔记的文件名（.json文件）',
          },
        },
        required: ['filename'],
      },
    },
    {
      name: 'xhs_create_or_update_post',
      description: '创建或更新待发布的笔记，写完帖子可以调用这个命令进入队列',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '笔记标题（作为唯一键）',
          },
          content: {
            type: 'string',
            description: '笔记内容（必需）',
          },
          images: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: '图片路径数组（可选）',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: '标签数组（可选），如 ["#MCP", "#AI"]',
          },
          location: {
            type: 'string',
            description: '位置信息（可选）',
          },
          draft: {
            type: 'boolean',
            description: '是否保存为草稿（可选），默认为 false',
          },
          scheduledPublishTime: {
            type: 'string',
            description: '计划发布时间（可选），ISO 8601 格式，如 "2024-01-01T10:00:00Z"',
          },
        },
        required: ['title', 'content'],
      },
    },
    {
      name: 'xhs_generate_cover',
      description: '根据标题生成小红书封面图片（支持Markdown格式的标题，如加粗、高亮等）',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '笔记标题（支持Markdown格式，如 **加粗**、`代码`等）',
          },
          templateId: {
            type: 'string',
            description: '封面模板ID（默认为"1"）',
            default: '1',
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'xhs_save_example',
      description: '保存范文（txt格式，文件名必须以.txt结尾）',
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: '范文文件名（必须以.txt结尾）',
          },
          content: {
            type: 'string',
            description: '范文内容（纯文本，不支持Markdown）',
          },
        },
        required: ['filename', 'content'],
      },
    },
  ];
}
