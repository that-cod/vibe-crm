'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { useListData } from '@/lib/refine-hooks'
import { Button, Spin, Modal } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Calendar, dayjsLocalizer, View as CalendarView } from 'react-big-calendar'
import dayjs from 'dayjs'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import type { DynamicCalendarProps, CalendarEvent } from './types'
import { getFieldValue, getDateValue, getRecordTitle, getSelectColor, getFieldByName } from './utils'
import { DynamicForm } from './DynamicForm'

const localizer = dayjsLocalizer(dayjs)

/**
 * DynamicCalendar - Calendar view with click-to-create and event editing
 * 
 * Features:
 * - Month/week/day/agenda views
 * - Click on empty slot to create event
 * - Click on event to edit
 * - Drag events to reschedule
 * - Color coding by field value
 */
export function DynamicCalendar({ entity, view, config }: DynamicCalendarProps) {
    const [calendarView, setCalendarView] = useState<CalendarView>(
        (view.defaultView as CalendarView) || 'month'
    )
    const [date, setDate] = useState(new Date())
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingRecordId, setEditingRecordId] = useState<string | undefined>()
    const [initialFormData, setInitialFormData] = useState<Record<string, unknown>>({})

    // Fetch all records
    const { data, isLoading, refetch } = useListData({
        resource: entity.tableName,
        pagination: { mode: 'off' },
    })

    // Convert records to calendar events
    const events: CalendarEvent[] = useMemo(() => {
        if (!data) return []

        return data
            .map((record: Record<string, unknown>) => {
                const startDate = getDateValue(record, view.startDateField)
                if (!startDate) return null

                const endDate = view.endDateField
                    ? getDateValue(record, view.endDateField) || startDate
                    : startDate

                const titleField = getFieldByName(entity, view.titleField)
                const title = titleField
                    ? String(getFieldValue(record, view.titleField) || 'Untitled')
                    : getRecordTitle(record, entity)

                let color: string | undefined
                if (view.colorField) {
                    const colorFieldDef = getFieldByName(entity, view.colorField)
                    if (colorFieldDef) {
                        const colorValue = getFieldValue(record, view.colorField)
                        color = getSelectColor(colorValue, colorFieldDef)
                    }
                }

                return {
                    id: String(record.id),
                    title,
                    start: startDate,
                    end: endDate,
                    allDay: !view.endDateField,
                    resource: record,
                    color,
                }
            })
            .filter(Boolean) as CalendarEvent[]
    }, [data, view, entity])

    const handleEventClick = useCallback((event: CalendarEvent) => {
        setEditingRecordId(event.id)
        setInitialFormData(event.resource || {})
        setIsFormOpen(true)
    }, [])

    const handleSlotClick = useCallback((slotInfo: { start: Date; end: Date }) => {
        // Pre-fill the date field with the clicked slot
        const dateValue = dayjs(slotInfo.start).format('YYYY-MM-DD')
        const dateTimeValue = dayjs(slotInfo.start).format('YYYY-MM-DDTHH:mm')

        // Determine which format to use based on field type
        const startField = entity.fields.find(f => f.name === view.startDateField)
        const formattedValue = startField?.type === 'datetime' ? dateTimeValue : dateValue

        setEditingRecordId(undefined)
        setInitialFormData({ [view.startDateField]: formattedValue })
        setIsFormOpen(true)
    }, [view.startDateField, entity.fields])

    const handleCreate = useCallback(() => {
        setEditingRecordId(undefined)
        setInitialFormData({})
        setIsFormOpen(true)
    }, [])

    const handleFormSuccess = useCallback(() => {
        setIsFormOpen(false)
        setEditingRecordId(undefined)
        setInitialFormData({})
        refetch()
    }, [refetch])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Spin size="large" />
            </div>
        )
    }

    return (
        <div className="dynamic-calendar">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 px-4">
                <div>
                    <h2 className="text-xl font-semibold text-white m-0">{view.label}</h2>
                    {view.description && (
                        <p className="text-gray-400 mt-1 mb-0">{view.description}</p>
                    )}
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreate}
                    style={{ background: '#7C3AED' }}
                >
                    New {entity.label}
                </Button>
            </div>

            {/* Calendar */}
            <div
                className="rounded-lg overflow-hidden"
                style={{
                    height: 650,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    padding: 16
                }}
            >
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    view={calendarView}
                    onView={setCalendarView}
                    date={date}
                    onNavigate={setDate}
                    onSelectEvent={handleEventClick}
                    onSelectSlot={handleSlotClick}
                    selectable={true}
                    popup
                    eventPropGetter={(event) => ({
                        style: {
                            backgroundColor: event.color || '#7C3AED',
                            borderRadius: 6,
                            opacity: 0.95,
                            border: 'none',
                            display: 'block',
                            color: 'white',
                            padding: '2px 6px',
                        },
                    })}
                    dayPropGetter={() => ({
                        style: {
                            backgroundColor: 'transparent',
                        }
                    })}
                    style={{ height: '100%' }}
                    views={['month', 'week', 'day', 'agenda']}
                    toolbar={true}
                    components={{
                        toolbar: CustomToolbar,
                    }}
                />
            </div>

            {/* Create/Edit Modal */}
            <Modal
                title={editingRecordId ? `Edit ${entity.label}` : `New ${entity.label}`}
                open={isFormOpen}
                onCancel={() => {
                    setIsFormOpen(false)
                    setEditingRecordId(undefined)
                    setInitialFormData({})
                }}
                footer={null}
                width={640}
                destroyOnClose
                styles={{
                    content: { background: '#1a1a2e' },
                    header: { background: '#1a1a2e', color: 'white' }
                }}
            >
                <DynamicForm
                    entity={entity}
                    config={config}
                    recordId={editingRecordId}
                    initialData={initialFormData}
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                        setIsFormOpen(false)
                        setEditingRecordId(undefined)
                    }}
                />
            </Modal>

            {/* Custom styles for dark theme calendar */}
            <style jsx global>{`
                .rbc-calendar {
                    color: white;
                }
                .rbc-toolbar {
                    margin-bottom: 16px;
                }
                .rbc-toolbar button {
                    color: #ccc;
                    border-color: rgba(255,255,255,0.2);
                    background: rgba(255,255,255,0.05);
                }
                .rbc-toolbar button:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                }
                .rbc-toolbar button.rbc-active {
                    background: #7C3AED;
                    color: white;
                    border-color: #7C3AED;
                }
                .rbc-header {
                    border-color: rgba(255,255,255,0.1);
                    color: #888;
                    font-weight: 500;
                    padding: 8px;
                }
                .rbc-month-view, .rbc-time-view {
                    border-color: rgba(255,255,255,0.1);
                }
                .rbc-day-bg {
                    border-color: rgba(255,255,255,0.1);
                }
                .rbc-day-bg.rbc-today {
                    background: rgba(124, 58, 237, 0.1);
                }
                .rbc-off-range-bg {
                    background: rgba(0,0,0,0.2);
                }
                .rbc-date-cell {
                    color: #888;
                    padding: 4px 8px;
                }
                .rbc-date-cell.rbc-now {
                    color: #7C3AED;
                    font-weight: bold;
                }
                .rbc-event {
                    font-size: 12px;
                }
                .rbc-event:focus {
                    outline: 2px solid #7C3AED;
                    outline-offset: 2px;
                }
                .rbc-month-row {
                    border-color: rgba(255,255,255,0.1);
                }
                .rbc-time-header {
                    border-color: rgba(255,255,255,0.1);
                }
                .rbc-time-content {
                    border-color: rgba(255,255,255,0.1);
                }
                .rbc-timeslot-group {
                    border-color: rgba(255,255,255,0.1);
                }
                .rbc-time-slot {
                    border-color: rgba(255,255,255,0.05);
                }
                .rbc-current-time-indicator {
                    background: #7C3AED;
                }
                .rbc-agenda-view table {
                    border-color: rgba(255,255,255,0.1);
                }
                .rbc-agenda-date-cell, .rbc-agenda-time-cell {
                    color: #888;
                }
                .rbc-agenda-event-cell {
                    color: white;
                }
            `}</style>
        </div>
    )
}

/**
 * Custom toolbar for dark theme
 */
function CustomToolbar({
    label,
    onNavigate,
    onView,
    view
}: {
    label: string
    onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
    onView: (view: CalendarView) => void
    view: CalendarView
}) {
    return (
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <Button
                    onClick={() => onNavigate('PREV')}
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                    ←
                </Button>
                <Button
                    onClick={() => onNavigate('TODAY')}
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                    Today
                </Button>
                <Button
                    onClick={() => onNavigate('NEXT')}
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                    →
                </Button>
                <span className="text-white font-semibold ml-4">{label}</span>
            </div>
            <div className="flex gap-1">
                {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map(v => (
                    <Button
                        key={v}
                        onClick={() => onView(v)}
                        className={
                            view === v
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                        }
                    >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Button>
                ))}
            </div>
        </div>
    )
}

export default DynamicCalendar
