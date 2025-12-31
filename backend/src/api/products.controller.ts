import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly prisma: PrismaService) { }

  @Get()
  async getProducts(@Request() req: any) {
    const companyId = req.user.companyId;

    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      variant: p.variant || '',
      quantity: p.quantity,
      price: `R$ ${Number(p.price).toFixed(2).replace('.', ',')}`,
      priceRaw: Number(p.price),
      sku: p.sku || '',
      imageUrl: p.imageUrl,
      status: p.quantity === 0 ? 'Out of Stock' : p.quantity < 10 ? 'Low Stock' : 'In Stock',
    }));
  }

  @Post()
  async createProduct(@Request() req: any, @Body() body: any) {
    const companyId = req.user.companyId;

    const product = await this.prisma.product.create({
      data: {
        name: body.name,
        variant: body.variant,
        quantity: body.quantity || 0,
        price: body.price || 0,
        sku: body.sku,
        imageUrl: body.imageUrl,
        companyId,
      },
    });

    return product;
  }

  @Put(':id')
  async updateProduct(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const companyId = req.user.companyId;

    // Verify ownership
    const existing = await this.prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return { error: 'Product not found' };
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        variant: body.variant,
        quantity: body.quantity,
        price: body.price,
        sku: body.sku,
        imageUrl: body.imageUrl,
      },
    });

    return product;
  }

  @Delete(':id')
  async deleteProduct(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    // Verify ownership
    const existing = await this.prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return { error: 'Product not found' };
    }

    // Soft delete by setting isActive to false
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }
}
