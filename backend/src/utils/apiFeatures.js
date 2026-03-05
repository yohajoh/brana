/**
 * APIFeatures - Reusable query builder for Prisma list endpoints
 *
 * Usage:
 *   const features = new APIFeatures(query, req.query);
 *   const { where, orderBy, skip, take } = features.filter().search(['title','description']).sort().paginate().build();
 */
export class APIFeatures {
  constructor(queryParams = {}) {
    this.params = { ...queryParams };
    this._where = {};
    this._orderBy = {};
    this._skip = 0;
    this._take = 10;
  }

  /**
   * Filter by exact fields supplied via query params.
   * Pass an array of allowed filter field names.
   * @param {string[]} allowedFields
   */
  filter(allowedFields = []) {
    allowedFields.forEach((field) => {
      if (this.params[field] !== undefined && this.params[field] !== '') {
        this._where[field] = this.params[field];
      }
    });
    return this;
  }

  /**
   * Add full-text search across multiple string fields.
   * @param {string[]} fields  e.g. ['title', 'description']
   */
  search(fields = []) {
    const q = this.params.search || this.params.q;
    if (q && fields.length > 0) {
      this._where.OR = fields.map((f) => ({
        [f]: { contains: q, mode: 'insensitive' },
      }));
    }
    return this;
  }

  /**
   * Sort results. Accepts ?sort=field or ?sort=-field (descending).
   * Defaults to created_at desc.
   * @param {string} defaultField
   */
  sort(defaultField = 'created_at') {
    const sort = this.params.sort || `-${defaultField}`;
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    this._orderBy = { [field]: desc ? 'desc' : 'asc' };
    return this;
  }

  /**
   * Paginate results. Accepts ?page=1&limit=10.
   */
  paginate() {
    const page = Math.max(1, parseInt(this.params.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(this.params.limit, 10) || 10));
    this._page = page;
    this._limit = limit;
    this._skip = (page - 1) * limit;
    this._take = limit;
    return this;
  }

  /**
   * Return the final Prisma query options plus a paginationMeta helper.
   */
  build() {
    return {
      where: Object.keys(this._where).length ? this._where : {},
      orderBy: this._orderBy,
      skip: this._skip,
      take: this._take,
      _page: this._page,
      _limit: this._limit,
    };
  }
}

/**
 * Build a pagination meta object.
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 */
export const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});
