CREATE TABLE project (
                         id SERIAL PRIMARY KEY,
                         name VARCHAR(255) NOT NULL,
                         description TEXT,
                         bim_path TEXT NOT NULL UNIQUE,
                         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE record (
                        id SERIAL PRIMARY KEY,
                        project_id INT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
                        name VARCHAR(255) NOT NULL,
                        uploaded_files_paths JSONB,
                        record_path TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analysis (
                          id SERIAL PRIMARY KEY,
                          project_id INT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
                          record_id INT NOT NULL REFERENCES record(id) ON DELETE CASCADE,
                          status VARCHAR(50) NOT NULL DEFAULT 'pending',
                          progress INT NOT NULL DEFAULT 0,
                          logs TEXT[] DEFAULT ARRAY[]::TEXT[],
                          error TEXT,
                          output_paths JSONB,
                          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                          started_at TIMESTAMP WITH TIME ZONE,
                          updated_at TIMESTAMP WITH TIME ZONE,
                          completed_at TIMESTAMP WITH TIME ZONE,
                          result_path TEXT,
                          summary_json_path TEXT,
                          mean_distance FLOAT,
                          std_deviation FLOAT
);

CREATE INDEX idx_project_bim_path ON project(bim_path);
CREATE INDEX idx_record_project_id ON record(project_id);
CREATE INDEX idx_analysis_project_id ON analysis(project_id);
CREATE INDEX idx_analysis_record_id ON analysis(record_id);
CREATE INDEX idx_analysis_status ON analysis(status);