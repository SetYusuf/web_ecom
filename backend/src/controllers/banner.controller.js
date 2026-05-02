const prisma = require('../prisma');

// Get active banners
const getBanners = async (req, res) => {
  try {
    const { placement } = req.query;
    const now = new Date();

    const where = {
      isActive: true,
    };

    if (placement) {
      where.placement = placement;
    }

    // Filter by date
    where.AND = [];
    where.AND.push({
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } },
      ],
    });
    where.AND.push({
      OR: [
        { endsAt: null },
        { endsAt: { gte: now } },
      ],
    });

    const banners = await prisma.banner.findMany({
      where,
      orderBy: { position: 'asc' },
    });

    res.json(banners);
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({ error: 'Failed to get banners.' });
  }
};

// Get single banner
const getBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await prisma.banner.findFirst({
      where: { id, isActive: true },
    });

    if (!banner) {
      return res.status(404).json({ error: 'Banner not found.' });
    }

    res.json(banner);
  } catch (error) {
    console.error('Get banner error:', error);
    res.status(500).json({ error: 'Failed to get banner.' });
  }
};

// Create banner (admin only)
const createBanner = async (req, res) => {
  try {
    const { title, image, link, position, placement, startsAt, endsAt, isActive } = req.body;

    const banner = await prisma.banner.create({
      data: {
        title,
        image,
        link,
        position: position || 0,
        placement,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json(banner);
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(500).json({ error: 'Failed to create banner.' });
  }
};

// Update banner (admin only)
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.startsAt) updateData.startsAt = new Date(updateData.startsAt);
    if (updateData.endsAt) updateData.endsAt = new Date(updateData.endsAt);

    const banner = await prisma.banner.update({
      where: { id },
      data: updateData,
    });

    res.json(banner);
  } catch (error) {
    console.error('Update banner error:', error);
    res.status(500).json({ error: 'Failed to update banner.' });
  }
};

// Delete banner (admin only)
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.banner.delete({
      where: { id },
    });

    res.json({ message: 'Banner deleted.' });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({ error: 'Failed to delete banner.' });
  }
};

module.exports = {
  getBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
};