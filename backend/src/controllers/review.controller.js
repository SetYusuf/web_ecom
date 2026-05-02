const prisma = require('../prisma');

// Get reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      productId,
      isApproved: true,
    };

    if (rating) {
      where.rating = parseInt(rating);
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where }),
    ]);

    // Calculate average rating
    const ratingStats = await prisma.review.groupBy({
      by: ['rating'],
      where: { productId, isApproved: true },
      _count: true,
    });

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      ratingStats,
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews.' });
  }
};

// Create review
const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: {
        productId,
        userId: req.user.id,
      },
    });

    if (existingReview) {
      return res.status(409).json({ error: 'You have already reviewed this product.' });
    }

    // Check if user purchased the product (for verified badge)
    const order = await prisma.order.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['DELIVERED', 'SHIPPED'] },
        items: {
          some: { productId },
        },
      },
    });

    const review = await prisma.review.create({
      data: {
        productId,
        userId: req.user.id,
        rating,
        title,
        comment,
        isVerified: !!order,
        isApproved: false, // Require admin approval
      },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Update product review stats
    const allReviews = await prisma.review.findMany({
      where: { productId, isApproved: true },
      select: { rating: true },
    });

    const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.product.update({
      where: { id: productId },
      data: {
        reviewAverage: averageRating,
        reviewCount: allReviews.length,
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review.' });
  }
};

// Approve/reject review (admin only)
const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    const review = await prisma.review.update({
      where: { id },
      data: { isApproved },
    });

    // Update product review stats
    const product = await prisma.product.findFirst({
      where: { id: review.productId },
    });

    if (product) {
      const allReviews = await prisma.review.findMany({
        where: { productId: review.productId, isApproved: true },
        select: { rating: true },
      });

      const averageRating = allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : null;

      await prisma.product.update({
        where: { id: review.productId },
        data: {
          reviewAverage: averageRating,
          reviewCount: allReviews.length,
        },
      });
    }

    res.json(review);
  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({ error: 'Failed to update review.' });
  }
};

// Delete review (admin only)
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findFirst({
      where: { id },
    });

    await prisma.review.delete({
      where: { id },
    });

    // Update product review stats
    if (review) {
      const allReviews = await prisma.review.findMany({
        where: { productId: review.productId, isApproved: true },
        select: { rating: true },
      });

      const averageRating = allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : null;

      await prisma.product.update({
        where: { id: review.productId },
        data: {
          reviewAverage: averageRating,
          reviewCount: allReviews.length,
        },
      });
    }

    res.json({ message: 'Review deleted.' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review.' });
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReviewStatus,
  deleteReview,
};