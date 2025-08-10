// This file is part of Pa11y Dashboard.
'use strict';

module.exports = presentProject;

function presentProject(name, tasks) {
	const slug = slugify(name || 'Unassigned');
	return {
		name: name || 'Unassigned',
		slug,
		href: `/project/${slug}`,
		taskCount: tasks.length
	};
}

function slugify(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '') || 'unassigned';
}

