const prisma = require('../prisma');

// Get all active pages
const getPages = async (req, res) => {
  try {
    const pages = await prisma.page.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        createdAt: true,
      },
      orderBy: { title: 'asc' },
    });

    res.json(pages);
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({ error: 'Failed to get pages.' });
  }
};

// Get single page by slug
const getPage = async (req, res) => {
  try {
    const { slug } = req.params;

    const page = await prisma.page.findFirst({
      where: { slug, isActive: true },
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found.' });
    }

    res.json(page);
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({ error: 'Failed to get page.' });
  }
};

// Create page (admin only)
const createPage = async (req, res) => {
  try {
    const { title, slug, content, excerpt, metaTitle, metaDescription, isActive } = req.body;

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        metaTitle,
        metaDescription,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json(page);
  } catch (error) {
    console.error('Create page error:', error);
    res.status(500).json({ error: 'Failed to create page.' });
  }
};

// Update page (admin only)
const updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const page = await prisma.page.update({
      where: { id },
      data: updateData,
    });

    res.json(page);
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({ error: 'Failed to update page.' });
  }
};

// Delete page (admin only)
const deletePage = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.page.delete({
      where: { id },
    });

    res.json({ message: 'Page deleted.' });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({ error: 'Failed to delete page.' });
  }
};

module.exports = {
  getPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
};