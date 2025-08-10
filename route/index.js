// This file is part of Pa11y Dashboard.
//
// Pa11y Dashboard is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Pa11y Dashboard is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Pa11y Dashboard.  If not, see <http://www.gnu.org/licenses/>.
'use strict';

const presentProject = require('../view/presenter/project');

module.exports = function index(app) {
	app.express.get('/', (request, response, next) => {
		app.webservice.tasks.get({lastres: true}, async (error, tasks) => {
			if (error) {
				return next(error);
			}

			let projects = [];
			let unassignedCount = 0;
			try {
				if (app.projects) {
					const [allProjects, mappedTaskIdsSet, counts] = await Promise.all([
						app.projects.getAllProjects(),
						app.projects.getAllMappedTaskIds(),
						app.projects.getProjectTaskCounts()
					]);
					projects = allProjects.map(p => ({
						name: p.name,
						slug: p.slug,
						href: `/project/${p.slug}`,
						taskCount: counts.get(String(p._id)) || 0
					}));
					const totalTasks = tasks.length;
					unassignedCount = totalTasks - mappedTaskIdsSet.size;
				}
			} catch (e) {
				// ignore store errors for rendering
			}

			if (!app.projects) {
				// Fallback: single Unassigned project with all tasks
				projects = [{name: 'Unassigned', slug: 'unassigned', href: '/project/unassigned', taskCount: tasks.length}];
			}

			// Add Unassigned if there are any
			if (unassignedCount > 0) {
				projects.unshift({
					name: 'Unassigned',
					slug: 'unassigned',
					href: '/project/unassigned',
					taskCount: unassignedCount
				});
			}

			response.render('projects', {
				projects,
				deleted: (typeof request.query.deleted !== 'undefined'),
				isHomePage: true
			});
		});
	});
};
