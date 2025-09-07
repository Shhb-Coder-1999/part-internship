/**
 * Minimal BaseController for Comments app
 */

import { createAppLogger } from '../../../../../packages/shared/utils/logger.js';

export class BaseController {
  constructor(service, options = {}) {
    this.service = service;
    this.resourceName = options.resourceName || 'Resource';
    this.logger = createAppLogger(`${this.resourceName}Controller`);
  }

  async getAllRecords(req, res, methodName) {
    const data = await this.service[methodName](
      { ...(req.query || {}) },
      req.user
    );
    return res.status(200).send({
      success: true,
      message: 'OK',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async getRecordById(req, res, methodName) {
    const data = await this.service[methodName](req.params.id, req.user);
    return res.status(200).send({
      success: true,
      message: 'OK',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async createRecord(req, res, methodName) {
    const data = await this.service[methodName](req.body, req.user);
    return res.status(201).send({
      success: true,
      message: 'Created',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async updateRecord(req, res, methodName) {
    const data = await this.service[methodName](
      req.params.id,
      req.body,
      req.user
    );
    return res.status(200).send({
      success: true,
      message: 'Updated',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async deleteRecord(req, res, methodName) {
    const data = await this.service[methodName](req.params.id, req.user);
    return res.status(200).send({
      success: true,
      message: 'Deleted',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async searchRecords(req, res, methodName) {
    const data = await this.service[methodName](req.query.q, req.user);
    return res.status(200).send({
      success: true,
      message: 'OK',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async getStats(req, res, methodName) {
    const data = await this.service[methodName]();
    return res.status(200).send({
      success: true,
      message: 'OK',
      data,
      timestamp: new Date().toISOString(),
    });
  }
}