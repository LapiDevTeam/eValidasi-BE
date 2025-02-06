  -- T_FORMULA_FIX
   
CREATE OR REPLACE FUNCTION process_t_protokolValidasi_hist() RETURNS TRIGGER AS $t_protokolValidasi_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_protokolValidasi_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_protokolValidasi_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_protokolValidasi_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_protokolValidasi_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_protokolValidasi_ins"
    AFTER INSERT ON "t_protokolValidasi"
    FOR EACH ROW EXECUTE FUNCTION process_t_protokolValidasi_hist();
CREATE OR REPLACE TRIGGER "t_protokolValidasi_upd"
    AFTER UPDATE ON "t_protokolValidasi"
    FOR EACH ROW EXECUTE FUNCTION process_t_protokolValidasi_hist();
CREATE OR REPLACE TRIGGER "t_protokolValidasi_del"
    AFTER DELETE ON "t_protokolValidasi"
    FOR EACH ROW EXECUTE FUNCTION process_t_protokolValidasi_hist();

  -- T_FORMULA_FIX_STATUS
   
CREATE OR REPLACE FUNCTION process_t_protokolValidasi_status_hist() RETURNS TRIGGER AS $t_protokolValidasi_status_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_protokolValidasi_status_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_protokolValidasi_status_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_protokolValidasi_status_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_protokolValidasi_status_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_protokolValidasi_status_ins"
    AFTER INSERT ON "t_protokolValidasi_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_protokolValidasi_status_hist();
CREATE OR REPLACE TRIGGER "t_protokolValidasi_status_upd"
    AFTER UPDATE ON "t_protokolValidasi_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_protokolValidasi_status_hist();
CREATE OR REPLACE TRIGGER "t_protokolValidasi_status_del"
    AFTER DELETE ON "t_protokolValidasi_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_protokolValidasi_status_hist();