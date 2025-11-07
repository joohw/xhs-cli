// 这个脚本是方便开发模板用的，用于预览模板效果


import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3300;

// 模板目录路径
const templatesDir = path.resolve(__dirname, '../Illustrate/templates/cover');

// 获取所有模板文件
function getTemplates() {
  return fs.readdirSync(templatesDir)
    .filter(file => file.startsWith('template_') && file.endsWith('.html'))
    .map(file => ({
      id: file.replace('template_', '').replace('.html', ''),
      name: file
    }));
}

// 创建预览页面
const previewHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>小红书封面模板预览器</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            min-height: 100vh;
            box-sizing: border-box;
            display: flex;
            gap: 20px;
        }
        .sidebar {
            width: 200px;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            height: fit-content;
        }
        .main-content {
            flex: 1;
            display: flex;
            gap: 20px;
        }
        .preview {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            flex: 1;
        }
        .controls {
            width: 300px;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            height: fit-content;
        }
        .template-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .template-item {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .template-item:hover {
            background: #f5f5f5;
        }
        .template-item.active {
            border-color: #ff4d4f;
            background: #fff1f0;
        }
        .input-group {
            margin-bottom: 15px;
        }
        .input-group label {
            display: block;
            margin-bottom: 5px;
            color: #666;
        }
        input, button {
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        button {
            background: #ff4d4f;
            color: white;
            border: none;
            cursor: pointer;
            margin-top: 15px;
        }
        button:hover {
            background: #ff7875;
        }
        iframe {
            border: none;
            width: 1080px;
            height: 1620px;
            transform-origin: top left;
            transform: scale(0.4);
            margin-bottom: -972px; /* 补偿缩放导致的空间 60% */
        }
        .preview-container {
            overflow: hidden;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="section-title">模板列表</div>
        <div id="templateList" class="template-list"></div>
    </div>
    <div class="main-content">
        <div class="preview">
            <div class="preview-container">
                <iframe id="previewFrame"></iframe>
            </div>
        </div>
        <div class="controls">
            <div class="section-title">标题编辑</div>
            <div class="input-group">
                <label for="titleInput">文章标题</label>
                <input type="text" id="titleInput" placeholder="输入标题文本" value="测试标题文本">
            </div>
            <button onclick="updatePreview()">更新预览</button>
        </div>
    </div>
    <script>
        let currentTemplateId = '1';

        // 加载模板列表
        fetch('/templates')
            .then(res => res.json())
            .then(templates => {
                const templateList = document.getElementById('templateList');
                templates.forEach(template => {
                    const item = document.createElement('div');
                    item.className = 'template-item' + (template.id === '1' ? ' active' : '');
                    item.textContent = \`模板 \${template.id}\`;
                    item.onclick = () => {
                        // 更新选中状态
                        document.querySelectorAll('.template-item').forEach(el => 
                            el.classList.remove('active'));
                        item.classList.add('active');
                        currentTemplateId = template.id;
                        updatePreview();
                    };
                    templateList.appendChild(item);
                });
                updatePreview();
            });

        // 监听输入框回车事件
        document.getElementById('titleInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                updatePreview();
            }
        });

        function updatePreview() {
            const title = document.getElementById('titleInput').value;
            const frame = document.getElementById('previewFrame');
            frame.src = \`/template/\${currentTemplateId}?title=\${encodeURIComponent(title)}\`;
        }
    </script>
</body>
</html>
`;

// 设置路由
app.get('/', (_req: Request, res: Response) => {
  res.send(previewHTML);
});

app.get('/templates', (_req: Request, res: Response) => {
  res.json(getTemplates());
});

app.get('/template/:id', (req: Request, res: Response) => {
  const templatePath = path.join(templatesDir, `template_${req.params.id}.html`);
  if (fs.existsSync(templatePath)) {
    res.sendFile(templatePath);
  } else {
    res.status(404).send('Template not found');
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 模板预览器已启动!`);
  console.log(`📱 访问 http://localhost:${port} 查看预览`);
  // 自动打开浏览器
  open(`http://localhost:${port}`);
});