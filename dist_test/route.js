"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.DELETE = DELETE;
exports.PUT = PUT;
var server_1 = require("next/server");
var headers_1 = require("next/headers");
var jose_1 = require("jose");
var db_1 = require("@/lib/db");
var isomorphic_dompurify_1 = require("isomorphic-dompurify");
var utils_1 = require("@/lib/utils");
var audit_1 = require("@/lib/audit");
exports.dynamic = 'force-dynamic';
var SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);
function checkAdmin() {
    return __awaiter(this, void 0, void 0, function () {
        var cookieStore, token, payload, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, headers_1.cookies)()];
                case 1:
                    cookieStore = _c.sent();
                    token = (_b = cookieStore.get('access_token')) === null || _b === void 0 ? void 0 : _b.value;
                    if (!token)
                        return [2 /*return*/, null];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, (0, jose_1.jwtVerify)(token, SESSION_SECRET)];
                case 3:
                    payload = (_c.sent()).payload;
                    if (payload.role !== 'admin')
                        return [2 /*return*/, null];
                    return [2 /*return*/, payload];
                case 4:
                    _a = _c.sent();
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function GET(req) {
    return __awaiter(this, void 0, void 0, function () {
        var admin, searchParams, search, categoryId, status_1, page, limit, offset, where, params, whereClause, query, result, countQuery, countRes, total, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkAdmin()];
                case 1:
                    admin = _a.sent();
                    if (!admin)
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 })];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    searchParams = new URL(req.url).searchParams;
                    search = searchParams.get('search') || '';
                    categoryId = searchParams.get('categoryId') || '';
                    status_1 = searchParams.get('status') || '';
                    page = parseInt(searchParams.get('page') || '1');
                    limit = 10;
                    offset = (page - 1) * limit;
                    where = ["courses.status != 'deleted'"];
                    params = [];
                    if (search) {
                        params.push("%".concat(search, "%"));
                        where.push("(courses.name ILIKE $".concat(params.length, " OR u.first_name ILIKE $").concat(params.length, " OR u.last_name ILIKE $").concat(params.length, " OR u.email ILIKE $").concat(params.length, ")"));
                    }
                    if (categoryId) {
                        params.push(categoryId);
                        where.push("courses.category_id = $".concat(params.length));
                    }
                    if (status_1) {
                        params.push(status_1);
                        where.push("courses.status = $".concat(params.length));
                    }
                    whereClause = where.length > 0 ? "WHERE ".concat(where.join(' AND ')) : '';
                    query = "\n      SELECT \n        courses.id, courses.name, courses.slug, courses.price, courses.level, courses.dur, courses.emoji, courses.g, courses.tag, courses.tag_label, courses.status, courses.certificate_type, courses.created_at, courses.category_id, courses.instructor_id, courses.logo, courses.details, courses.what_you_will_learn,\n        courses.description, courses.short_description, courses.learning_points, courses.requirements, courses.target_audience, courses.tags_array, courses.thumbnail, courses.preview_video, courses.difficulty, courses.language, courses.certificate_enabled, courses.estimated_completion,\n        cat.name as category_name, \n        u.first_name, u.last_name, u.email,\n        (SELECT COUNT(*) FROM certificates WHERE course_id = courses.id) as issued_count\n      FROM courses\n      LEFT JOIN categories cat ON cat.id = courses.category_id\n      LEFT JOIN instructors i ON i.id = courses.instructor_id\n      LEFT JOIN users u ON u.id = i.user_id\n      ".concat(whereClause, "\n      ORDER BY courses.created_at DESC\n      LIMIT ").concat(limit, " OFFSET ").concat(offset, "\n    ");
                    return [4 /*yield*/, db_1.default.query(query, params)];
                case 3:
                    result = _a.sent();
                    countQuery = "\n      SELECT COUNT(*) \n      FROM courses \n      LEFT JOIN instructors i ON i.id = courses.instructor_id\n      LEFT JOIN users u ON u.id = i.user_id\n      ".concat(whereClause, "\n    ");
                    return [4 /*yield*/, db_1.default.query(countQuery, params)];
                case 4:
                    countRes = _a.sent();
                    total = parseInt(countRes.rows[0].count);
                    return [2 /*return*/, server_1.NextResponse.json({
                            courses: result.rows,
                            pagination: {
                                total: total,
                                page: page,
                                limit: limit,
                                totalPages: Math.ceil(total / limit)
                            }
                        })];
                case 5:
                    err_1 = _a.sent();
                    console.error(err_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: 'Internal Server Error', details: err_1.message }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function DELETE(req) {
    return __awaiter(this, void 0, void 0, function () {
        var admin, searchParams, id, courseRes, course, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkAdmin()];
                case 1:
                    admin = _a.sent();
                    if (!admin)
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 })];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, , 7]);
                    searchParams = new URL(req.url).searchParams;
                    id = searchParams.get('id');
                    if (!id)
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Missing ID' }, { status: 400 })];
                    return [4 /*yield*/, db_1.default.query('SELECT status, name FROM courses WHERE id = $1', [id])];
                case 3:
                    courseRes = _a.sent();
                    if (courseRes.rows.length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Course not found' }, { status: 404 })];
                    }
                    course = courseRes.rows[0];
                    // SOFT DELETE: Change status to 'deleted' to preserve enrolment records
                    return [4 /*yield*/, db_1.default.query("UPDATE courses SET status = 'deleted' WHERE id = $1", [id])];
                case 4:
                    // SOFT DELETE: Change status to 'deleted' to preserve enrolment records
                    _a.sent();
                    // Log audit event
                    return [4 /*yield*/, (0, audit_1.logAdminAction)(admin.id, 'course_delete', 'course', id, { status: course.status }, { status: 'deleted' })];
                case 5:
                    // Log audit event
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, message: 'Course soft-deleted successfully' })];
                case 6:
                    err_2 = _a.sent();
                    console.error(err_2);
                    return [2 /*return*/, server_1.NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function PUT(req) {
    return __awaiter(this, void 0, void 0, function () {
        var admin, body, id, name_1, slug, category_id, instructor_id, price, level, dur, emoji, g, tag, tag_label, certificate_type, logo, details, what_you_will_learn, description, short_description, learning_points, requirements, target_audience, tags_array, thumbnail, preview_video, difficulty, language, certificate_enabled, estimated_completion, safeJson, duplicateCheck, courseRes, oldCourse, updateFields, values, idx, query, updateRes, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkAdmin()];
                case 1:
                    admin = _a.sent();
                    if (!admin)
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 })];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 9, , 10]);
                    return [4 /*yield*/, req.json()];
                case 3:
                    body = _a.sent();
                    id = body.id, name_1 = body.name, slug = body.slug, category_id = body.category_id, instructor_id = body.instructor_id, price = body.price, level = body.level, dur = body.dur, emoji = body.emoji, g = body.g, tag = body.tag, tag_label = body.tag_label, certificate_type = body.certificate_type, logo = body.logo, details = body.details, what_you_will_learn = body.what_you_will_learn, description = body.description, short_description = body.short_description, learning_points = body.learning_points, requirements = body.requirements, target_audience = body.target_audience, tags_array = body.tags_array, thumbnail = body.thumbnail, preview_video = body.preview_video, difficulty = body.difficulty, language = body.language, certificate_enabled = body.certificate_enabled, estimated_completion = body.estimated_completion;
                    slug = (0, utils_1.slugify)(slug || name_1);
                    if (description) {
                        description = isomorphic_dompurify_1.default.sanitize(description.toString().trim());
                    }
                    safeJson = function (val) { return JSON.stringify(Array.isArray(val) ? val.map(function (i) { return i.toString().trim().substring(0, 200); }) : []); };
                    if (!id || !name_1 || !slug || !category_id || !instructor_id) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Missing required fields' }, { status: 400 })];
                    }
                    if (price !== undefined && price < 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Price cannot be negative' }, { status: 400 })];
                    }
                    if (dur !== undefined && dur < 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Duration cannot be negative' }, { status: 400 })];
                    }
                    if (!(slug || name_1)) return [3 /*break*/, 5];
                    return [4 /*yield*/, db_1.default.query("SELECT id FROM courses WHERE (slug = $1 OR name = $2) AND id != $3", [slug, name_1 === null || name_1 === void 0 ? void 0 : name_1.trim(), id])];
                case 4:
                    duplicateCheck = _a.sent();
                    if (duplicateCheck.rows.length > 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'A course with this name or slug already exists' }, { status: 400 })];
                    }
                    _a.label = 5;
                case 5: return [4 /*yield*/, db_1.default.query('SELECT name, slug, price, level, dur, emoji, g, tag, tag_label, certificate_type, logo, details, what_you_will_learn FROM courses WHERE id = $1', [id])];
                case 6:
                    courseRes = _a.sent();
                    if (courseRes.rows.length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Course not found' }, { status: 404 })];
                    }
                    oldCourse = courseRes.rows[0];
                    updateFields = [];
                    values = [id];
                    idx = 2;
                    if (name_1 !== undefined) {
                        updateFields.push("name = $".concat(idx++));
                        values.push(name_1);
                    }
                    if (slug !== undefined) {
                        updateFields.push("slug = $".concat(idx++));
                        values.push(slug);
                    }
                    if (category_id !== undefined) {
                        updateFields.push("category_id = $".concat(idx++));
                        values.push(category_id);
                    }
                    if (instructor_id !== undefined) {
                        updateFields.push("instructor_id = $".concat(idx++));
                        values.push(instructor_id);
                    }
                    if (price !== undefined) {
                        updateFields.push("price = $".concat(idx++));
                        values.push(price);
                    }
                    if (level !== undefined) {
                        updateFields.push("level = $".concat(idx++));
                        values.push(level);
                    }
                    if (dur !== undefined) {
                        updateFields.push("dur = $".concat(idx++));
                        values.push(dur);
                    }
                    if (emoji !== undefined) {
                        updateFields.push("emoji = $".concat(idx++));
                        values.push(emoji);
                    }
                    if (g !== undefined) {
                        updateFields.push("g = $".concat(idx++));
                        values.push(g);
                    }
                    if (tag !== undefined) {
                        updateFields.push("tag = $".concat(idx++));
                        values.push(tag);
                    }
                    if (tag_label !== undefined) {
                        updateFields.push("tag_label = $".concat(idx++));
                        values.push(tag_label);
                    }
                    if (certificate_type !== undefined) {
                        updateFields.push("certificate_type = $".concat(idx++));
                        values.push(certificate_type);
                    }
                    if (logo !== undefined) {
                        updateFields.push("logo = $".concat(idx++));
                        values.push(logo);
                    }
                    if (details !== undefined) {
                        updateFields.push("details = $".concat(idx++));
                        values.push(JSON.stringify(details));
                    }
                    if (what_you_will_learn !== undefined) {
                        updateFields.push("what_you_will_learn = $".concat(idx++));
                        values.push(what_you_will_learn);
                    }
                    if (description !== undefined) {
                        updateFields.push("description = $".concat(idx++));
                        values.push(description);
                    }
                    if (short_description !== undefined) {
                        updateFields.push("short_description = $".concat(idx++));
                        values.push(short_description);
                    }
                    if (learning_points !== undefined) {
                        updateFields.push("learning_points = $".concat(idx++));
                        values.push(safeJson(learning_points));
                    }
                    if (requirements !== undefined) {
                        updateFields.push("requirements = $".concat(idx++));
                        values.push(safeJson(requirements));
                    }
                    if (target_audience !== undefined) {
                        updateFields.push("target_audience = $".concat(idx++));
                        values.push(safeJson(target_audience));
                    }
                    if (tags_array !== undefined) {
                        updateFields.push("tags_array = $".concat(idx++));
                        values.push(safeJson(tags_array));
                    }
                    if (thumbnail !== undefined) {
                        updateFields.push("thumbnail = $".concat(idx++));
                        values.push(thumbnail);
                    }
                    if (preview_video !== undefined) {
                        updateFields.push("preview_video = $".concat(idx++));
                        values.push(preview_video);
                    }
                    if (difficulty !== undefined) {
                        updateFields.push("difficulty = $".concat(idx++));
                        values.push(difficulty);
                    }
                    if (language !== undefined) {
                        updateFields.push("language = $".concat(idx++));
                        values.push(language);
                    }
                    if (certificate_enabled !== undefined) {
                        updateFields.push("certificate_enabled = $".concat(idx++));
                        values.push(certificate_enabled);
                    }
                    if (estimated_completion !== undefined) {
                        updateFields.push("estimated_completion = $".concat(idx++));
                        values.push(estimated_completion);
                    }
                    if (updateFields.length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ message: 'No fields to update' }, { status: 200 })];
                    }
                    query = "UPDATE courses SET ".concat(updateFields.join(', '), ", updated_at = NOW() WHERE id = $1 RETURNING id");
                    return [4 /*yield*/, db_1.default.query(query, values)];
                case 7:
                    updateRes = _a.sent();
                    if (updateRes.rows.length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Course not found' }, { status: 404 })];
                    }
                    // Log audit event
                    return [4 /*yield*/, (0, audit_1.logAdminAction)(admin.id, 'course_update', 'course', id, oldCourse, { name: name_1, slug: slug, category_id: category_id, instructor_id: instructor_id, price: price })];
                case 8:
                    // Log audit event
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, message: 'Course updated successfully' })];
                case 9:
                    err_3 = _a.sent();
                    console.error(err_3);
                    if (err_3.code === '23505') {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Slug already exists. Please choose a different slug.' }, { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
