// GitHub API configuration
const repoOwner = 'Nallasivan30';
const repoName = 'decapPublic';
const branch = 'main';

// Function to fetch content from GitHub
async function fetchContent(path) {
    try {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}?ref=${branch}`);
        if (!response.ok) throw new Error('Failed to fetch content');
        const data = await response.json();
        
        if (Array.isArray(data)) {
            // Directory listing
            return Promise.all(data.map(async item => {
                if (item.type === 'file') {
                    const fileResponse = await fetch(item.download_url);
                    return fileResponse.text();
                }
                return null;
            }));
        } else {
            // Single file
            const fileResponse = await fetch(data.download_url);
            return fileResponse.text();
        }
    } catch (error) {
        console.error('Error fetching content:', error);
        return null;
    }
}

// Function to parse frontmatter from markdown
function parseFrontmatter(markdown) {
    const frontmatter = {};
    const bodyStart = markdown.indexOf('---', 3) + 3;
    const frontmatterText = markdown.slice(3, bodyStart - 3).trim();
    
    frontmatterText.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            frontmatter[key] = value.replace(/^['"]|['"]$/g, '');
        }
    });
    
    const body = markdown.slice(bodyStart).trim();
    return { ...frontmatter, body };
}

// Display posts
async function displayPosts() {
    const postsContainer = document.getElementById('posts-container');
    const posts = await fetchContent('content/posts');
    
    if (posts && posts.length) {
        posts.forEach(postContent => {
            if (!postContent) return;
            
            const { title, date, image, body } = parseFrontmatter(postContent);
            const postElement = document.createElement('article');
            postElement.className = 'post';
            postElement.innerHTML = `
                <h3>${title}</h3>
                <p class="date">${new Date(date).toLocaleDateString()}</p>
                ${image ? `<img src="${image}" alt="${title}" class="post-image">` : ''}
                <div class="post-body">${marked.parse(body)}</div>
            `;
            postsContainer.appendChild(postElement);
        });
    } else {
        postsContainer.innerHTML = '<p>No posts found.</p>';
    }
}

// Display images
async function displayImages() {
    const imagesContainer = document.getElementById('images-container');
    const images = await fetchContent('content/images');
    
    if (images && images.length) {
        images.forEach(imageContent => {
            if (!imageContent) return;
            
            const { name, caption } = parseFrontmatter(imageContent);
            const imageElement = document.createElement('div');
            imageElement.className = 'image-item';
            imageElement.innerHTML = `
                <img src="/content/images/${name}" alt="${caption || name}">
                ${caption ? `<p class="caption">${caption}</p>` : ''}
            `;
            imagesContainer.appendChild(imageElement);
        });
    } else {
        imagesContainer.innerHTML = '<p>No images found.</p>';
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Include marked.js for markdown parsing
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    script.onload = () => {
        displayPosts();
        displayImages();
    };
    document.head.appendChild(script);
});