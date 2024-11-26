  -- T_kelengkapan dokumen
   
CREATE OR REPLACE FUNCTION process_t_kelengkapanDokumen_hist() RETURNS TRIGGER AS $t_kelengkapanDokumen_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_kelengkapanDokumen_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_kelengkapanDokumen_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_kelengkapanDokumen_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_kelengkapanDokumen_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_kelengkapanDokumen_ins"
    AFTER INSERT ON "t_kelengkapanDokumen"
    FOR EACH ROW EXECUTE FUNCTION process_t_kelengkapanDokumen_hist();
CREATE OR REPLACE TRIGGER "t_kelengkapanDokumen_upd"
    AFTER UPDATE ON "t_kelengkapanDokumen"
    FOR EACH ROW EXECUTE FUNCTION process_t_kelengkapanDokumen_hist();
CREATE OR REPLACE TRIGGER "t_kelengkapanDokumen_del"
    AFTER DELETE ON "t_kelengkapanDokumen"
    FOR EACH ROW EXECUTE FUNCTION process_t_kelengkapanDokumen_hist();

  -- T_produkterdampak
   
CREATE OR REPLACE FUNCTION process_t_produkTerdampak_hist() RETURNS TRIGGER AS $t_produkTerdampak_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_produkTerdampak_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_produkTerdampak_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_produkTerdampak_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_produkTerdampak_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_produkTerdampak_ins"
    AFTER INSERT ON "t_produkTerdampak"
    FOR EACH ROW EXECUTE FUNCTION process_t_produkTerdampak_hist();
CREATE OR REPLACE TRIGGER "t_produkTerdampak_upd"
    AFTER UPDATE ON "t_produkTerdampak"
    FOR EACH ROW EXECUTE FUNCTION process_t_produkTerdampak_hist();
CREATE OR REPLACE TRIGGER "t_produkTerdampak_del"
    AFTER DELETE ON "t_produkTerdampak"
    FOR EACH ROW EXECUTE FUNCTION process_t_produkTerdampak_hist();

  -- T_proposal diversifikasi
   
CREATE OR REPLACE FUNCTION process_t_proposalDiversifikasi_hist() RETURNS TRIGGER AS $t_proposalDiversifikasi_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_proposalDiversifikasi_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_proposalDiversifikasi_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_proposalDiversifikasi_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_proposalDiversifikasi_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_proposalDiversifikasi_ins"
    AFTER INSERT ON "t_proposalDiversifikasi"
    FOR EACH ROW EXECUTE FUNCTION process_t_proposalDiversifikasi_hist();
CREATE OR REPLACE TRIGGER "t_proposalDiversifikasi_upd"
    AFTER UPDATE ON "t_proposalDiversifikasi"
    FOR EACH ROW EXECUTE FUNCTION process_t_proposalDiversifikasi_hist();
CREATE OR REPLACE TRIGGER "t_proposalDiversifikasi_del"
    AFTER DELETE ON "t_proposalDiversifikasi"
    FOR EACH ROW EXECUTE FUNCTION process_t_proposalDiversifikasi_hist();

  -- T_persentasi dalam formula
   
CREATE OR REPLACE FUNCTION process_t_persentaseDalamFormula_hist() RETURNS TRIGGER AS $t_persentaseDalamFormula_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_persentaseDalamFormula_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_persentaseDalamFormula_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_persentaseDalamFormula_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_persentaseDalamFormula_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_persentaseDalamFormula_ins"
    AFTER INSERT ON "t_persentaseDalamFormula"
    FOR EACH ROW EXECUTE FUNCTION process_t_persentaseDalamFormula_hist();
CREATE OR REPLACE TRIGGER "t_persentaseDalamFormula_upd"
    AFTER UPDATE ON "t_persentaseDalamFormula"
    FOR EACH ROW EXECUTE FUNCTION process_t_persentaseDalamFormula_hist();
CREATE OR REPLACE TRIGGER "t_persentaseDalamFormula_del"
    AFTER DELETE ON "t_persentaseDalamFormula"
    FOR EACH ROW EXECUTE FUNCTION process_t_persentaseDalamFormula_hist();

  -- T_jumlahBetsPerTahun
   
CREATE OR REPLACE FUNCTION process_t_jumlahBetsPerTahun_hist() RETURNS TRIGGER AS $t_jumlahBetsPerTahun_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_jumlahBetsPerTahun_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_jumlahBetsPerTahun_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_jumlahBetsPerTahun_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_jumlahBetsPerTahun_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_jumlahBetsPerTahun_ins"
    AFTER INSERT ON "t_jumlahBetsPerTahun"
    FOR EACH ROW EXECUTE FUNCTION process_t_jumlahBetsPerTahun_hist();
CREATE OR REPLACE TRIGGER "t_jumlahBetsPerTahun_upd"
    AFTER UPDATE ON "t_jumlahBetsPerTahun"
    FOR EACH ROW EXECUTE FUNCTION process_t_jumlahBetsPerTahun_hist();
CREATE OR REPLACE TRIGGER "t_jumlahBetsPerTahun_del"
    AFTER DELETE ON "t_jumlahBetsPerTahun"
    FOR EACH ROW EXECUTE FUNCTION process_t_jumlahBetsPerTahun_hist();

  -- T total skoring
   
CREATE OR REPLACE FUNCTION process_t_totalSkoring_hist() RETURNS TRIGGER AS $t_totalSkoring_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_totalSkoring_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_totalSkoring_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_totalSkoring_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_totalSkoring_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_totalSkoring_ins"
    AFTER INSERT ON "t_totalSkoring"
    FOR EACH ROW EXECUTE FUNCTION process_t_totalSkoring_hist();
CREATE OR REPLACE TRIGGER "t_totalSkoring_upd"
    AFTER UPDATE ON "t_totalSkoring"
    FOR EACH ROW EXECUTE FUNCTION process_t_totalSkoring_hist();
CREATE OR REPLACE TRIGGER "t_totalSkoring_del"
    AFTER DELETE ON "t_totalSkoring"
    FOR EACH ROW EXECUTE FUNCTION process_t_totalSkoring_hist();

  -- T timeline trial
   
CREATE OR REPLACE FUNCTION process_t_timelineTrial_hist() RETURNS TRIGGER AS $t_timelineTrial_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_timelineTrial_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_timelineTrial_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_timelineTrial_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_timelineTrial_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_timelineTrial_ins"
    AFTER INSERT ON "t_timelineTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_timelineTrial_hist();
CREATE OR REPLACE TRIGGER "t_timelineTrial_upd"
    AFTER UPDATE ON "t_timelineTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_timelineTrial_hist();
CREATE OR REPLACE TRIGGER "t_timelineTrial_del"
    AFTER DELETE ON "t_timelineTrial"
    FOR EACH ROW EXECUTE FUNCTION process_t_timelineTrial_hist();

  -- T proposalDiversifikasiStatus
   
CREATE OR REPLACE FUNCTION process_t_proposalDiversifikasi_status_hist() RETURNS TRIGGER AS $t_proposalDiversifikasi_status_hist$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO "t_proposalDiversifikasi_status_hist"
                SELECT 'DELETED', now(), OLD.*;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO "t_proposalDiversifikasi_status_hist"
                SELECT 'UPDATED', now(), NEW.*;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO "t_proposalDiversifikasi_status_hist"
                SELECT 'INSERTED', now(), NEW.*;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$t_proposalDiversifikasi_status_hist$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "t_proposalDiversifikasi_status_ins"
    AFTER INSERT ON "t_proposalDiversifikasi_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_proposalDiversifikasi_status_hist();
CREATE OR REPLACE TRIGGER "t_proposalDiversifikasi_status_upd"
    AFTER UPDATE ON "t_proposalDiversifikasi_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_proposalDiversifikasi_status_hist();
CREATE OR REPLACE TRIGGER "t_proposalDiversifikasi_status_del"
    AFTER DELETE ON "t_proposalDiversifikasi_status"
    FOR EACH ROW EXECUTE FUNCTION process_t_proposalDiversifikasi_status_hist();