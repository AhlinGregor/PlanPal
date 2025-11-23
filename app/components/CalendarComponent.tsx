import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 7; // 60px for time column

// Calculate available height for calendar grid
// Subtract day headers (~60px), tasks row (~40px), tab bar (~50px), status bar (~40px)
const AVAILABLE_HEIGHT = height - 190;

interface Task {
	id: string;
	title: string;
	date: string; // ISO date string: "2025-11-18"
	startHour: number;
	endHour: number;
	color: string;
}

interface DayTask {
	id: string;
	title: string;
	date: string; // ISO date string: "2025-11-18"
	completed: boolean;
}

interface CalendarComponentProps {
	events?: Task[];
	tasks?: DayTask[];
	onAddButtonPress?: () => void;
	onEditEvent?: (task: Task) => void;
}

// Helper function to create a date string from current week
function getDateString(weekStart: Date, dayOffset: number): string {
	const date = new Date(weekStart);
	date.setDate(weekStart.getDate() + dayOffset);
	return date.toISOString().split('T')[0]; // "2025-11-18"
}

// Create default events for the current week
function getDefaultEventsForWeek(weekStart: Date): Task[] {
	return [
		{ id: '1', title: 'Team Meeting', date: getDateString(weekStart, 0), startHour: 9, endHour: 10, color: '#ff6b6b' },
		{ id: '2', title: 'Study Math', date: getDateString(weekStart, 1), startHour: 14, endHour: 16, color: '#4ecdc4' },
		{ id: '3', title: 'Project Work', date: getDateString(weekStart, 2), startHour: 10, endHour: 13, color: '#45b7d1' },
		{ id: '4', title: 'Gym', date: getDateString(weekStart, 3), startHour: 18, endHour: 19.5, color: '#96ceb4' },
		{ id: '5', title: 'Science Lab', date: getDateString(weekStart, 4), startHour: 13, endHour: 15, color: '#ffeaa7' },
	];
}

// Helper to detect overlapping events
function getOverlappingGroups(tasks: Task[], date: string): Task[][] {
	const dayTasks = tasks.filter(t => t.date === date).sort((a, b) => a.startHour - b.startHour);
	const groups: Task[][] = [];
	
	for (const task of dayTasks) {
		let addedToGroup = false;
		
		// Try to add to existing group
		for (const group of groups) {
			const overlaps = group.some(t => 
				task.startHour < t.endHour && task.endHour > t.startHour
			);
			
			if (overlaps) {
				group.push(task);
				addedToGroup = true;
				break;
			}
		}
		
		// Create new group if no overlap found
		if (!addedToGroup) {
			groups.push([task]);
		}
	}
	
	return groups;
}

// Helper function to get Monday of a given week
function getMonday(date: Date) {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	return new Date(d.setDate(diff));
}

function CalendarComponent({ events, tasks: dayTasks = [], onAddButtonPress, onEditEvent }: CalendarComponentProps) {
	const flatListRef = useRef<FlatList>(null);
	const [tasks, setTasks] = useState<Task[]>(events || []);

	// Generate weeks for infinite scroll (current week in middle)
	const generateWeeks = useCallback(() => {
		const weeks = [];
		const today = new Date();
		const currentMonday = getMonday(today);
		
		// Generate 21 weeks: 10 before, current, 10 after
		for (let i = -10; i <= 10; i++) {
			const weekStart = new Date(currentMonday);
			weekStart.setDate(currentMonday.getDate() + (i * 7));
			weeks.push({
				key: `week-${i}`,
				weekStart: weekStart,
				index: i
			});
		}
		return weeks;
	}, []);

	const [weeks] = useState(generateWeeks());

	// Update tasks when events prop changes
	useEffect(() => {
		if (events) {
			setTasks(events);
		}
	}, [events]);

	// Function to count tasks for a specific date
	const getTaskCountForDate = (date: Date): number => {
		const dateString = date.toISOString().split('T')[0];
		return dayTasks.filter(task => task.date === dateString && !task.completed).length;
	};

	// Calculate dynamic hour range based on events for specific week
	const getHourRangeForWeek = (weekStart: Date) => {
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekStart.getDate() + 7);
		
		const weekTasks = tasks.filter(task => {
			const taskDate = new Date(task.date);
			return taskDate >= weekStart && taskDate < weekEnd;
		});

		if (weekTasks.length === 0) {
			return { startHour: 8, endHour: 18 };
		}

		let earliestHour = 24;
		let latestHour = 0;

		weekTasks.forEach((task) => {
			if (task.endHour === undefined || isNaN(task.endHour)) {
				return;
			}
			
			const taskStartHour = Math.floor(task.startHour);
			const taskEndHour = Math.ceil(task.endHour);
			
			earliestHour = Math.min(earliestHour, taskStartHour);
			latestHour = Math.max(latestHour, taskEndHour);
		});

		if (latestHour === 0 || isNaN(latestHour)) {
			return { startHour: 8, endHour: 18 };
		}

		earliestHour = Math.max(0, earliestHour - 1);
		latestHour = Math.min(23, latestHour + 1);

		return { startHour: earliestHour, endHour: latestHour };
	};
	
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	const formatDate = (date: Date) => {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	};

	const getWeekDates = (weekStart: Date) => {
		const dates = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(weekStart);
			date.setDate(weekStart.getDate() + i);
			dates.push(date);
		}
		return dates;
	};

	const formatHour = (hour: number) => {
		const wholeHour = Math.floor(hour);
		const minutes = Math.round((hour - wholeHour) * 60);
		
		let hourDisplay = wholeHour;
		let period = 'AM';
		
		if (wholeHour === 0) {
			hourDisplay = 12;
		} else if (wholeHour === 12) {
			period = 'PM';
		} else if (wholeHour > 12) {
			hourDisplay = wholeHour - 12;
			period = 'PM';
		}
		
		if (minutes === 0) {
			return `${hourDisplay} ${period}`;
		}
		return `${hourDisplay}:${minutes.toString().padStart(2, '0')} ${period}`;
	};

	const isToday = (date: Date) => {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	};

	// Render a single week view
	const renderWeek = useCallback(({ item }: { item: { key: string; weekStart: Date; index: number } }) => {
		const { weekStart } = item;
		const weekDates = getWeekDates(weekStart);
		const hourRange = getHourRangeForWeek(weekStart);
		const hours = Array.from({ length: hourRange.endHour - hourRange.startHour }, (_, i) => hourRange.startHour + i);
		const HOUR_HEIGHT = AVAILABLE_HEIGHT / hours.length;

		return (
			<View style={[styles.container, { width, height }]}>
				{/* Header with week range */}
				<View style={styles.header}>
					<Text style={styles.headerTitle}>
						{formatDate(weekDates[0])} - {formatDate(weekDates[6])}
					</Text>
				</View>

				{/* Day headers */}
				<View style={styles.dayHeaderRow}>
					<View style={styles.timeColumnHeader} />
					{days.map((day, index) => {
						return (
							<View
								key={day}
								style={[
									styles.dayHeader,
									isToday(weekDates[index]) && styles.todayHeader
								]}
							>
								<Text style={[
									styles.dayText,
									isToday(weekDates[index]) && styles.todayText
								]}>
									{day}
								</Text>
								<Text style={[
									styles.dateText,
									isToday(weekDates[index]) && styles.todayDateText
								]}>
									{weekDates[index].getDate()}
								</Text>
							</View>
						);
					})}
				</View>

				{/* Tasks row */}
				<View style={styles.tasksRow}>
					<View style={styles.tasksLabelColumn}>
						<Text style={styles.tasksLabel}>Tasks</Text>
					</View>
					{days.map((day, index) => {
						const taskCount = getTaskCountForDate(weekDates[index]);
						return (
							<View key={`task-${day}`} style={styles.taskCountCell}>
								{taskCount > 0 && (
									<View style={styles.taskCountBadge}>
										<Text style={styles.taskCountText}>{taskCount}</Text>
									</View>
								)}
							</View>
						);
					})}
				</View>

				{/* Calendar grid - No scroll, fits to screen */}
				<View style={styles.gridContainer}>
					{hours.map((hour) => (
						<View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
							{/* Time label */}
							<View style={styles.timeColumn}>
								<Text style={styles.timeText}>{formatHour(hour)}</Text>
							</View>

							{/* Day columns */}
							{days.map((day, dayIndex) => {
								const columnDate = weekDates[dayIndex];
								const columnDateString = columnDate.toISOString().split('T')[0];
								
								// Get all tasks for this day and hour
								const hourTasks = tasks.filter(task => {
									const taskStartHour = Math.floor(task.startHour);
									return task.date === columnDateString && taskStartHour === hour;
								});
								
								// Check for overlaps within this hour
								const overlappingGroups = getOverlappingGroups(hourTasks, columnDateString);
								const maxOverlap = Math.max(...overlappingGroups.map(g => g.length), 1);
								
								return (
									<View 
										key={`${hour}-${day}`} 
										style={[
											styles.dayColumn,
											isToday(columnDate) && styles.todayColumn
										]}
									>
										{/* Render tasks for this hour and day */}
										{hourTasks.map((task, taskIndex) => {
											const taskStartHour = Math.floor(task.startHour);
											const startMinutes = (task.startHour - taskStartHour) * 60;
											const topOffset = startMinutes;
											const duration = task.endHour - task.startHour;
											
											// Find which overlap group this task belongs to
											let overlapIndex = 0;
											let groupSize = 1;
											for (const group of overlappingGroups) {
												const idx = group.findIndex(t => t.id === task.id);
												if (idx !== -1) {
													overlapIndex = idx;
													groupSize = group.length;
													break;
												}
											}
											
											// Calculate width and position for overlapping events
											const taskWidth = groupSize > 1 ? (COLUMN_WIDTH - 8) / groupSize : COLUMN_WIDTH - 8;
											const leftOffset = groupSize > 1 ? overlapIndex * taskWidth : 0;
											
											return (
												<TouchableOpacity
													key={task.id}
													style={[
														styles.task,
														{
															backgroundColor: task.color,
															height: duration * HOUR_HEIGHT - 4,
															top: topOffset,
															width: taskWidth,
															left: leftOffset,
															borderWidth: groupSize > 1 ? 2 : 0,
															borderColor: '#fff',
															opacity: groupSize > 1 ? 0.9 : 1,
														},
													]}
													onLongPress={() => onEditEvent?.(task)}
													delayLongPress={500}
													activeOpacity={0.7}
												>
													<Text style={styles.taskTitle} numberOfLines={2}>
														{task.title}
													</Text>
													<Text style={styles.taskTime}>
														{formatHour(task.startHour)} - {formatHour(task.endHour)}
													</Text>
													{groupSize > 1 && (
														<View style={styles.overlapIndicator}>
															<Text style={styles.overlapText}>⚠️</Text>
														</View>
													)}
												</TouchableOpacity>
											);
										})}
									</View>
								);
							})}
						</View>
					))}
				</View>
			</View>
		);
	}, [tasks, events, width, height, AVAILABLE_HEIGHT]);

	return (
		<View style={styles.container}>
			<FlatList
				ref={flatListRef}
				data={weeks}
				renderItem={renderWeek}
				keyExtractor={(item) => item.key}
				pagingEnabled
				snapToInterval={height}
				decelerationRate="fast"
				showsVerticalScrollIndicator={false}
				initialScrollIndex={10}
				getItemLayout={(data, index) => ({
					length: height,
					offset: height * index,
					index,
				})}
			/>
			
			{/* Fixed Add button - stays in place while scrolling */}
			<TouchableOpacity style={styles.addButton} onPress={onAddButtonPress}>
				<Text style={styles.addButtonText}>+</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#25292e',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: '#1a1d21',
		borderBottomWidth: 1,
		borderBottomColor: '#333',
	},
	headerTitle: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '600',
	},
	dayHeaderRow: {
		flexDirection: 'row',
		backgroundColor: '#1a1d21',
		borderBottomWidth: 2,
		borderBottomColor: '#ffd33d',
	},
	timeColumnHeader: {
		width: 60,
	},
	dayHeader: {
		width: COLUMN_WIDTH,
		alignItems: 'center',
		paddingVertical: 12,
		borderLeftWidth: 1,
		borderLeftColor: '#333',
		position: 'relative',
	},
	todayHeader: {
		backgroundColor: '#ffd33d20',
	},
	dayText: {
		color: '#aaa',
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 4,
	},
	todayText: {
		color: '#ffd33d',
	},
	dateText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	todayDateText: {
		color: '#ffd33d',
	},
	tasksRow: {
		flexDirection: 'row',
		backgroundColor: '#1a1d21',
		borderBottomWidth: 1,
		borderBottomColor: '#333',
		paddingVertical: 8,
	},
	tasksLabelColumn: {
		width: 60,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tasksLabel: {
		color: '#aaa',
		fontSize: 12,
		fontWeight: '600',
	},
	taskCountCell: {
		width: COLUMN_WIDTH,
		alignItems: 'center',
		justifyContent: 'center',
		borderLeftWidth: 1,
		borderLeftColor: '#333',
	},
	taskSection: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		gap: 6,
	},
	taskLabel: {
		color: '#aaa',
		fontSize: 11,
		fontWeight: '600',
	},
	taskCountBadge: {
		backgroundColor: '#ffd33d',
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 6,
	},
	taskCountText: {
		color: '#25292e',
		fontSize: 11,
		fontWeight: 'bold',
	},
	scrollView: {
		flex: 1,
	},
	gridContainer: {
		flexDirection: 'column',
	},
	hourRow: {
		flexDirection: 'row',
		// height is set dynamically in render
		borderBottomWidth: 1,
		borderBottomColor: '#333',
	},
	timeColumn: {
		width: 60,
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingTop: 4,
	},
	timeText: {
		color: '#666',
		fontSize: 11,
		fontWeight: '500',
	},
	dayColumn: {
		width: COLUMN_WIDTH,
		borderLeftWidth: 1,
		borderLeftColor: '#333',
		position: 'relative',
	},
	todayColumn: {
		backgroundColor: '#ffd33d10',
	},
	task: {
		position: 'absolute',
		left: 2,
		right: 2,
		top: 2,
		borderRadius: 6,
		padding: 8,
		overflow: 'hidden',
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
	},
	taskTitle: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 2,
	},
	taskTime: {
		color: '#fff',
		fontSize: 10,
		opacity: 0.9,
	},
	addButton: {
		position: 'absolute',
		bottom: 30,
		right: 30,
		backgroundColor: '#ffd33d',
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
	},
	addButtonText: {
		fontSize: 34,
		fontWeight: 'bold',
		color: '#25292e',
		marginTop: -2,
	},
	overlapIndicator: {
		position: 'absolute',
		top: 4,
		right: 4,
		backgroundColor: 'rgba(255, 255, 255, 0.3)',
		borderRadius: 10,
		width: 20,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	overlapText: {
		fontSize: 12,
	},
});

export { CalendarComponent, Task };