const prisma = require('../prisma');

// Validate coupon code
const validateCoupon = async (req, res) => {
  try {
    const { code } = req.query;
    const { subtotal } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required.' });
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
      },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid coupon code.' });
    }

    // Check date validity
    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      return res.status(400).json({ error: 'Coupon is not yet valid.' });
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      return res.status(400).json({ error: 'Coupon has expired.' });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached.' });
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        error: `Minimum order amount is $${coupon.minOrderAmount}.`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = subtotal * (coupon.value / 100);
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else if (coupon.type === 'FIXED') {
      discount = coupon.value;
    } else if (coupon.type === 'FREE_SHIPPING') {
      discount = null; // Will be handled in order creation
    }

    res.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      description: coupon.description,
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: 'Failed to validate coupon.' });
  }
};

// Create coupon (admin only)
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      value,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      startsAt,
      expiresAt,
      applicableCategories,
      applicableProducts,
    } = req.body;

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        type,
        value: parseFloat(value),
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        applicableCategories: applicableCategories ? JSON.stringify(applicableCategories) : null,
        applicableProducts: applicableProducts ? JSON.stringify(applicableProducts) : null,
      },
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Failed to create coupon.' });
  }
};

// Get all coupons (admin only)
const getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(coupons);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ error: 'Failed to get coupons.' });
  }
};

// Update coupon (admin only)
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.value) updateData.value = parseFloat(updateData.value);
    if (updateData.minOrderAmount !== undefined) updateData.minOrderAmount = parseFloat(updateData.minOrderAmount);
    if (updateData.maxDiscount !== undefined) updateData.maxDiscount = parseFloat(updateData.maxDiscount);
    if (updateData.usageLimit !== undefined) updateData.usageLimit = parseInt(updateData.usageLimit);

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    res.json(coupon);
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Failed to update coupon.' });
  }
};

// Delete coupon (admin only)
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.coupon.delete({
      where: { id },
    });

    res.json({ message: 'Coupon deleted.' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Failed to delete coupon.' });
  }
};

module.exports = {
  validateCoupon,
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
};