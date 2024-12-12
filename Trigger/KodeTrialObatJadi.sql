 -- M_KodeTrialObatJadi
   
CREATE OR REPLACE FUNCTION process_m_kodeTrialObatJadi_hist() RETURNS TRIGGER AS $m_kodeTrialObatJadi_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "m_kodeTrialObatJadi_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "m_kodeTrialObatJadi_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "m_kodeTrialObatJadi_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$m_kodeTrialObatJadi_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "m_kodeTrialObatJadi_ins"
    AFTER INSERT ON "m_kodeTrialObatJadi"
    FOR EACH ROW EXECUTE FUNCTION process_m_kodeTrialObatJadi_hist();
CREATE OR REPLACE TRIGGER "m_kodeTrialObatJadi_upd"
    AFTER UPDATE ON "m_kodeTrialObatJadi"
    FOR EACH ROW EXECUTE FUNCTION process_m_kodeTrialObatJadi_hist();
CREATE OR REPLACE TRIGGER "m_kodeTrialObatJadi_del"
    AFTER DELETE ON "m_kodeTrialObatJadi"
    FOR EACH ROW EXECUTE FUNCTION process_m_kodeTrialObatJadi_hist();

 -- M_KodeTrialObatJadiTemplate
   
CREATE OR REPLACE FUNCTION process_m_kodeTrialObatJadi_template_hist() RETURNS TRIGGER AS $m_kodeTrialObatJadi_template_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "m_kodeTrialObatJadi_template_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "m_kodeTrialObatJadi_template_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "m_kodeTrialObatJadi_template_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$m_kodeTrialObatJadi_template_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "m_kodeTrialObatJadi_template_ins"
    AFTER INSERT ON "m_kodeTrialObatJadi_template"
    FOR EACH ROW EXECUTE FUNCTION process_m_kodeTrialObatJadi_template_hist();
CREATE OR REPLACE TRIGGER "m_kodeTrialObatJadi_template_upd"
    AFTER UPDATE ON "m_kodeTrialObatJadi_template"
    FOR EACH ROW EXECUTE FUNCTION process_m_kodeTrialObatJadi_template_hist();
CREATE OR REPLACE TRIGGER "m_kodeTrialObatJadi_template_del"
    AFTER DELETE ON "m_kodeTrialObatJadi_template"
    FOR EACH ROW EXECUTE FUNCTION process_m_kodeTrialObatJadi_template_hist();