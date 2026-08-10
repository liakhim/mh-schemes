-- // add schemes
-- Migration SQL that makes the change goes here.
create table schemes
(
    id bigserial primary key,
    name varchar(255) not null,
    description text,
    user_id bigint,
    version integer not null default 1,
    system_device_id integer,
    incoming_scheme jsonb not null,
    selection_config jsonb,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);

create index schemes_user_id_index on schemes (user_id);
create index schemes_system_device_id_index on schemes (system_device_id);

-- @UNDO
-- SQL to undo the change goes here.
drop table schemes;
