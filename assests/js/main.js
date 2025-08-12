// GitHub API configuration
// const repoOwner = 'Nallasivan30';
// const repoName = 'decapPublic';
// const branch = 'main';

// Configuration
const CONFIG = {
    GITHUB_OWNER: 'Nallasivan30', // Replace with your GitHub username
    GITHUB_REPO: 'decapPublic', // Replace with your repo name
    GITHUB_BRANCH: 'main'
};

// Utility functions
const githubAPI = {
    async fetchFile(path) {
        const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${path}?ref=${CONFIG.GITHUB_BRANCH}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${path}`);
            }
            const data = await response.json();
            return atob(data.content);
        } catch (error) {
            console.error('Error fetching file:', error);
            return null;
        }
    },

    async fetchDirectory(path) {
        const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${path}?ref=${CONFIG.GITHUB_BRANCH}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch directory ${path}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching directory:', error);
            return [];
        }
    }
};

// Content parsers
function parseFrontMatter(content) {
    const lines = content.split('\n');
    const frontMatter = {};
    let inFrontMatter = false;
    let contentStart = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '---') {
            if (!inFrontMatter) {
                inFrontMatter = true;
                continue;
            } else {
                contentStart = i + 1;
                break;
            }
        }
        
        if (inFrontMatter && line.includes(':')) {
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim().replace(/['"]/g, '');
            frontMatter[key.trim()] = value;
        }
    }
    
    const bodyContent = lines.slice(contentStart).join('\n');
    return { frontMatter, content: bodyContent };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function createPostExcerpt(content, maxLength = 150) {
    const textContent = content.replace(/[#*\[\]]/g, '').trim();
    return textContent.length > maxLength 
        ? textContent.substring(0, maxLength) + '...' 
        : textContent;
}

// Content loaders
async function loadPosts() {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) return;

    postsContainer.innerHTML = '<div class="loading">Loading posts...</div>';

    try {
        const files = await githubAPI.fetchDirectory('content/posts');
        const posts = [];

        for (const file of files) {
            if (file.name.endsWith('.md')) {
                const content = await githubAPI.fetchFile(`content/posts/${file.name}`);
                if (content) {
                    const { frontMatter, content: bodyContent } = parseFrontMatter(content);
                    posts.push({
                        ...frontMatter,
                        content: bodyContent,
                        slug: file.name.replace('.md', '')
                    });
                }
            }
        }

        // Sort posts by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (posts.length === 0) {
            postsContainer.innerHTML = '<div class="loading">No posts found.</div>';
            return;
        }

        postsContainer.innerHTML = posts.map(post => {
            const tags = post.tags ? post.tags.split(',').map(tag => tag.trim()) : [];
            const excerpt = createPostExcerpt(post.content);
            const imageHtml = post.image 
            ? `<img src="https://raw.githubusercontent.com/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/${CONFIG.GITHUB_BRANCH}/content/${post.image}" alt="${post.title}" class="post-image">` 
            : '';


            return `
                <article class="post-card">
                    ${imageHtml}
                    <h3>${post.title}</h3>
                    <div class="date">${formatDate(post.date)}</div>
                    <div class="excerpt">${excerpt}</div>
                    <div class="tags">
                        ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </article>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = '<div class="loading">Error loading posts.</div>';
    }
}

async function loadImages() {
    const imagesContainer = document.getElementById('images-container');
    if (!imagesContainer) return;

    imagesContainer.innerHTML = '<div class="loading">Loading images...</div>';

    try {
        const files = await githubAPI.fetchDirectory('content/images');
        const images = [];

        for (const file of files) {
            if (file.name.endsWith('.json')) {
                const content = await githubAPI.fetchFile(`content/images/${file.name}`);
                if (content) {
                    try {
                        const imageData = JSON.parse(content);
                        images.push(imageData);
                    } catch (parseError) {
                        console.error(`Error parsing ${file.name}:`, parseError);
                    }
                }
            }
        }

        if (images.length === 0) {
            imagesContainer.innerHTML = '<div class="loading">No images found.</div>';
            return;
        }

        imagesContainer.innerHTML = images.map(image => `
            <div class="image-card">
                <img src="https://raw.githubusercontent.com/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/${CONFIG.GITHUB_BRANCH}/content/${image.image}" alt="${image.alt || image.title}">
                <h4>${image.title}</h4>
                ${image.description ? `<p>${image.description}</p>` : ''}
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading images:', error);
        imagesContainer.innerHTML = '<div class="loading">Error loading images.</div>';
    }
}

async function loadHeroImage() {
    const heroImage = document.getElementById('hero-image');
    if (!heroImage) return;

    try {
        const settingsContent = await githubAPI.fetchFile('content/settings/site.json');
        if (settingsContent) {
            const settings = JSON.parse(settingsContent);
            if (settings.hero_image) {
                heroImage.style.backgroundImage = `url(${settings.hero_image})`;
            }
        }
    } catch (error) {
        console.error('Error loading hero image:', error);
    }
}


async function loadTestimonials() {
    const testimonialsContainer = document.getElementById('testimonials-container');
    if (!testimonialsContainer) return;

    testimonialsContainer.innerHTML = '<div class="loading">Loading testimonials...</div>';

    try {
        const files = await githubAPI.fetchDirectory('content/testimonials');
        const testimonials = [];

        for (const file of files) {
            if (file.name.endsWith('.json')) {
                const content = await githubAPI.fetchFile(`content/testimonials/${file.name}`);
                if (content) {
                    try {
                        const testimonialData = JSON.parse(content);
                        testimonials.push(testimonialData);
                    } catch (parseError) {
                        console.error(`Error parsing ${file.name}:`, parseError);
                    }
                }
            }
        }

        if (testimonials.length === 0) {
            testimonialsContainer.innerHTML = '<div class="loading">No testimonials found.</div>';
            return;
        }

        testimonialsContainer.innerHTML = testimonials.map(t => {
            const rating = parseFloat(t.rating) || 5;

            // Full stars
            const fullStars = Math.floor(rating);
            // Half star if rating has decimal >= 0.5
            const halfStar = rating % 1 >= 0.5 ? 1 : 0;
            // Remaining empty stars
            const emptyStars = 5 - fullStars - halfStar;

            const starsHtml = 
                '<i class="fas fa-star"></i>'.repeat(fullStars) +
                (halfStar ? '<i class="fas fa-star-half-alt"></i>' : '') +
                '<i class="far fa-star"></i>'.repeat(emptyStars);

            return `
                <div class="testimonial-card">
                    <div class="stars">${starsHtml}</div>
                    <p>"${t.review}"</p>
                    <div class="customer-info">
                        <h4>${t.name}</h4>
                        ${t.role ? `<span>${t.role}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading testimonials:', error);
        testimonialsContainer.innerHTML = '<div class="loading">Error loading testimonials.</div>';
    }
}




// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Loading content from GitHub repository...');
    
    // Load all content
    loadPosts();
    loadImages();
    loadHeroImage();
    loadTestimonials(); // ✅ New
});

// Refresh content every 5 minutes when page is active
let refreshInterval;

function startContentRefresh() {
    refreshInterval = setInterval(() => {
        if (!document.hidden) {
            console.log('Refreshing content...');
            loadPosts();
            loadImages();
            loadHeroImage();
            loadTestimonials();
        }
    }, 300000); // 5 minutes
}

function stopContentRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopContentRefresh();
    } else {
        startContentRefresh();
    }
});

// Start refresh cycle
startContentRefresh();